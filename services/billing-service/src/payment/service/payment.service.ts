import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { eq, and, inArray, gte, lte, desc, count, sum, avg } from 'drizzle-orm';
import { DrizzleService, type DrizzleTx } from '../../db/drizzle.service';
import { payments, paymentSplits, refunds, billingKeys, paymentOutboxEvents } from '../../db/schema';
import { PaymentStatus, PaymentMethod, RefundStatus, OutboxStatus, SplitStatus } from '../../contracts/enums';
import { TossApiService, TossPaymentResponse } from './toss-api.service';
import { AppException, Errors } from '../../common/exceptions';
import { PgBossService } from '../../common/pgboss/pgboss.service';
import {
  PreparePaymentDto,
  ConfirmPaymentDto,
  CancelPaymentDto,
  IssueBillingKeyDto,
  BillingPaymentDto,
  GetPaymentsFilterDto,
} from '../dto/payment.dto';
import { v4 as uuidv4 } from 'uuid';

/** numeric/sum 결과(string|null) → number */
const num = (v: string | number | null | undefined): number => (v == null ? 0 : Number(v));

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tossApi: TossApiService,
    private readonly pgboss: PgBossService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async preparePayment(dto: PreparePaymentDto) {
    const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const [payment] = await this.db
      .insert(payments)
      .values({
        orderId,
        orderName: dto.orderName,
        amount: dto.amount,
        userId: dto.userId,
        bookingId: dto.bookingId,
        status: PaymentStatus.READY,
        metadata: dto.metadata ?? null,
      })
      .returning();
    this.logger.log(`Payment prepared: ${orderId} for user ${dto.userId}`);
    return { paymentId: payment.id, orderId: payment.orderId, amount: payment.amount, orderName: payment.orderName };
  }

  async confirmPayment(dto: ConfirmPaymentDto) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.orderId, dto.orderId)).limit(1);
    if (!payment) throw new AppException(Errors.Payment.NOT_FOUND);
    if (payment.status !== PaymentStatus.READY) {
      throw new AppException(Errors.Payment.INVALID_STATUS, `현재 상태: ${payment.status}`);
    }
    if (payment.amount !== dto.amount) {
      throw new AppException(Errors.Payment.AMOUNT_MISMATCH, `예상 금액: ${payment.amount}원, 요청 금액: ${dto.amount}원`);
    }

    await this.db.update(payments).set({ status: PaymentStatus.IN_PROGRESS, paymentKey: dto.paymentKey }).where(eq(payments.id, payment.id));
    await this.scheduleReconcile(payment.id);

    try {
      const tossResponse = await this.tossApi.confirmPayment(dto.paymentKey, dto.orderId, dto.amount);
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);
      await this.createOutboxEvent('payment.confirmed', {
        paymentId: updatedPayment.id,
        paymentKey: dto.paymentKey,
        orderId: dto.orderId,
        amount: dto.amount,
        bookingId: payment.bookingId,
        userId: payment.userId,
      });
      this.logger.log(`Payment confirmed: ${dto.orderId}`);
      return updatedPayment;
    } catch (error) {
      if (this.isNetworkUncertainError(error)) {
        this.logger.warn(`[confirmPayment] network uncertain, deferring to reconcile: ${dto.orderId}`);
        throw error;
      }
      await this.markPaymentAborted(payment.id, { reason: 'confirm_failed', errorMessage: error instanceof Error ? error.message : undefined });
      throw error;
    }
  }

  private async scheduleReconcile(paymentId: number) {
    try {
      await this.pgboss.send('payment-reconcile', { paymentId }, { startAfter: 300, singletonKey: `reconcile-${paymentId}`, retryLimit: 3, retryBackoff: true });
    } catch (err) {
      this.logger.warn(`[Reconcile] schedule failed for payment ${paymentId}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  private isNetworkUncertainError(error: unknown): boolean {
    if (error instanceof AppException) {
      return error.code === Errors.External.UNAVAILABLE.code || error.code === Errors.External.TIMEOUT.code;
    }
    return false;
  }

  async reconcilePayment(paymentId: number): Promise<unknown> {
    const [payment] = await this.db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
    if (!payment) return { skipped: true, reason: 'not_found' };

    const terminalStatuses: PaymentStatus[] = [
      PaymentStatus.DONE, PaymentStatus.CANCELED, PaymentStatus.PARTIAL_CANCELED, PaymentStatus.ABORTED, PaymentStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(payment.status)) return { skipped: true, currentStatus: payment.status };

    if (!payment.paymentKey) {
      this.logger.warn(`[Reconcile] payment ${paymentId} has no paymentKey, marking ABORTED`);
      await this.markPaymentAborted(payment.id, { reason: 'reconcile_no_payment_key', errorMessage: 'paymentKey not recorded before reconcile' });
      return { handled: 'aborted_no_key' };
    }

    const tossPayment = await this.tossApi.getPayment(payment.paymentKey);
    this.logger.log(`[Reconcile] payment ${paymentId}, toss status=${tossPayment.status}`);

    switch (tossPayment.status) {
      case 'DONE': {
        await this.updatePaymentFromToss(payment.id, tossPayment);
        await this.createOutboxEvent('payment.confirmed', {
          paymentId: payment.id, paymentKey: payment.paymentKey, orderId: payment.orderId, amount: payment.amount, bookingId: payment.bookingId, userId: payment.userId,
        });
        return { handled: 'reconciled_done' };
      }
      case 'ABORTED':
      case 'EXPIRED': {
        await this.markPaymentAborted(payment.id, { reason: `toss_${tossPayment.status.toLowerCase()}`, errorMessage: `Toss reported ${tossPayment.status} during reconcile` });
        return { handled: `reconciled_${tossPayment.status.toLowerCase()}` };
      }
      case 'CANCELED':
      case 'PARTIAL_CANCELED': {
        await this.db.update(payments).set({ status: this.mapPaymentStatus(tossPayment.status) }).where(eq(payments.id, payment.id));
        return { handled: `synced_${tossPayment.status.toLowerCase()}` };
      }
      case 'WAITING_FOR_DEPOSIT':
        return { skipped: true, currentStatus: tossPayment.status };
      case 'IN_PROGRESS':
      case 'READY':
        throw new Error(`Toss status still pending: ${tossPayment.status}`);
      default:
        this.logger.warn(`[Reconcile] unexpected toss status: ${tossPayment.status}`);
        throw new Error(`unexpected toss status: ${tossPayment.status}`);
    }
  }

  async abandonPaymentByOrderId(data: { orderId: string; reason: 'failed' | 'cancelled'; errorCode?: string; errorMessage?: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.orderId, data.orderId)).limit(1);

    if (payment) {
      if (payment.status === PaymentStatus.ABORTED) {
        this.logger.log(`Payment already ABORTED: ${data.orderId} (idempotent)`);
        return payment;
      }
      if (payment.status === PaymentStatus.DONE) {
        throw new AppException(Errors.Payment.INVALID_STATUS, '이미 결제 완료된 건은 취소 saga로 처리해야 합니다');
      }
      return this.markPaymentAborted(payment.id, { reason: data.reason, errorCode: data.errorCode, errorMessage: data.errorMessage });
    }

    const [split] = await this.db.select().from(paymentSplits).where(eq(paymentSplits.orderId, data.orderId)).limit(1);
    if (!split) throw new AppException(Errors.Payment.NOT_FOUND);

    return this.markSplitAborted(split, { reason: data.reason, errorCode: data.errorCode, errorMessage: data.errorMessage });
  }

  private async markSplitAborted(
    split: { id: number; orderId: string; bookingId: number; userId: number; status: SplitStatus },
    meta: { reason: string; errorCode?: string; errorMessage?: string },
  ) {
    if (split.status === SplitStatus.CANCELLED) {
      this.logger.log(`Split already CANCELLED: ${split.orderId} (idempotent)`);
      return split;
    }
    if (split.status === SplitStatus.PAID) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '이미 결제 완료된 split은 CANCEL_BOOKING saga로 처리해야 합니다');
    }
    if (split.status !== SplitStatus.PENDING) {
      throw new AppException(Errors.Payment.INVALID_STATUS, `split 상태가 PENDING이 아닙니다: ${split.status}`);
    }

    const { outboxEventId } = await this.db.transaction(async (tx) => {
      await tx.update(paymentSplits).set({ status: SplitStatus.CANCELLED }).where(eq(paymentSplits.id, split.id));
      const event = await this.insertOutboxEvent(tx, 'payment.failed', {
        bookingId: split.bookingId, orderId: split.orderId, userId: split.userId,
        reason: meta.reason, errorCode: meta.errorCode, errorMessage: meta.errorMessage, paymentMethod: 'dutchpay',
      });
      this.logger.log(`Split CANCELLED + outbox: ${split.orderId} (booking ${split.bookingId})`);
      return { outboxEventId: event.id };
    });

    await this.triggerOutboxJob(outboxEventId);
    return { ...split, status: SplitStatus.CANCELLED };
  }

  private async markPaymentAborted(paymentId: number, meta: { reason: string; errorCode?: string; errorMessage?: string }) {
    const { payment, outboxEventId } = await this.db.transaction(async (tx) => {
      const [updated] = await tx.update(payments).set({ status: PaymentStatus.ABORTED }).where(eq(payments.id, paymentId)).returning();
      if (!updated.bookingId) {
        this.logger.warn(`Payment ABORTED without bookingId: ${updated.orderId}`);
        return { payment: updated, outboxEventId: undefined as number | undefined };
      }
      const event = await this.insertOutboxEvent(tx, 'payment.failed', {
        paymentId: updated.id, bookingId: updated.bookingId, orderId: updated.orderId, userId: updated.userId,
        reason: meta.reason, errorCode: meta.errorCode, errorMessage: meta.errorMessage,
      });
      this.logger.log(`Payment ABORTED + outbox: ${updated.orderId} (booking ${updated.bookingId})`);
      return { payment: updated, outboxEventId: event.id as number | undefined };
    });

    if (outboxEventId !== undefined) await this.triggerOutboxJob(outboxEventId);
    return payment;
  }

  async cancelPayment(dto: CancelPaymentDto) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.paymentKey, dto.paymentKey)).limit(1);
    if (!payment) throw new AppException(Errors.Payment.NOT_FOUND);
    if (payment.status === PaymentStatus.CANCELED) throw new AppException(Errors.Payment.ALREADY_CANCELLED);
    if (payment.status !== PaymentStatus.DONE && payment.status !== PaymentStatus.PARTIAL_CANCELED) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '완료된 결제만 취소할 수 있습니다');
    }

    if (dto.cancelAmount) {
      const [agg] = await this.db.select({ sum: sum(refunds.cancelAmount) }).from(refunds).where(eq(refunds.paymentId, payment.id));
      const totalRefunded = num(agg.sum);
      const remainingAmount = payment.amount - totalRefunded;
      if (dto.cancelAmount > remainingAmount) {
        throw new AppException(Errors.Refund.EXCEED_AMOUNT, `환불 가능 금액: ${remainingAmount}원`);
      }
    }

    const tossResponse = await this.tossApi.cancelPayment(dto.paymentKey, dto.cancelReason, dto.cancelAmount, dto.refundReceiveAccount);

    const latestCancel = tossResponse.cancels?.[tossResponse.cancels.length - 1];
    if (latestCancel) {
      await this.db.insert(refunds).values({
        paymentId: payment.id,
        transactionKey: latestCancel.transactionKey,
        cancelAmount: latestCancel.cancelAmount,
        cancelReason: latestCancel.cancelReason,
        refundStatus: RefundStatus.COMPLETED,
        refundedAt: new Date(latestCancel.canceledAt),
      });
    }

    const newStatus = dto.cancelAmount ? PaymentStatus.PARTIAL_CANCELED : PaymentStatus.CANCELED;
    const [updatedPayment] = await this.db.update(payments).set({ status: newStatus }).where(eq(payments.id, payment.id)).returning();

    await this.createOutboxEvent('payment.canceled', {
      paymentId: payment.id, paymentKey: dto.paymentKey, cancelAmount: dto.cancelAmount || payment.amount, bookingId: payment.bookingId, userId: payment.userId,
    });
    this.logger.log(`Payment canceled: ${dto.paymentKey}`);
    return updatedPayment;
  }

  async cancelPaymentByBookingId(data: { bookingId: number; cancelReason: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.bookingId, data.bookingId)).limit(1);
    if (!payment) {
      this.logger.warn(`No payment found for bookingId=${data.bookingId}, skipping refund`);
      return { skipped: true, reason: 'Payment not found' };
    }
    if (payment.status === PaymentStatus.CANCELED || payment.status === PaymentStatus.PARTIAL_CANCELED) {
      this.logger.warn(`Payment for bookingId=${data.bookingId} already canceled (status=${payment.status}), skipping`);
      return { skipped: true, reason: 'Already canceled' };
    }
    if (payment.status !== PaymentStatus.DONE) {
      this.logger.warn(`Payment for bookingId=${data.bookingId} not in DONE status (status=${payment.status}), skipping refund`);
      return { skipped: true, reason: `Invalid status: ${payment.status}` };
    }
    if (!payment.paymentKey) {
      this.logger.error(`Payment for bookingId=${data.bookingId} has no paymentKey, cannot cancel`);
      return { skipped: true, reason: 'No paymentKey' };
    }
    const result = await this.cancelPayment({ paymentKey: payment.paymentKey, cancelReason: data.cancelReason });
    this.logger.log(`Payment canceled for bookingId=${data.bookingId}, paymentKey=${payment.paymentKey}`);
    return result;
  }

  async issueBillingKey(dto: IssueBillingKeyDto) {
    const [existing] = await this.db.select().from(billingKeys).where(and(eq(billingKeys.customerKey, dto.customerKey), eq(billingKeys.isActive, true))).limit(1);
    if (existing) throw new AppException(Errors.Billing.KEY_ALREADY_EXISTS);

    const tossResponse = await this.tossApi.issueBillingKey(dto.authKey, dto.customerKey);
    const [billingKey] = await this.db
      .insert(billingKeys)
      .values({
        billingKey: tossResponse.billingKey,
        customerKey: tossResponse.customerKey,
        userId: dto.userId,
        authenticatedAt: new Date(tossResponse.authenticatedAt),
        cardNumber: tossResponse.card.number,
        cardCompany: tossResponse.card.company,
        cardType: tossResponse.card.cardType,
        isActive: true,
      })
      .returning();
    this.logger.log(`Billing key issued for user ${dto.userId}`);
    return billingKey;
  }

  async billingPayment(dto: BillingPaymentDto) {
    const [billingKeyRecord] = await this.db.select().from(billingKeys).where(eq(billingKeys.billingKey, dto.billingKey)).limit(1);
    if (!billingKeyRecord || !billingKeyRecord.isActive) throw new AppException(Errors.Billing.KEY_NOT_FOUND);

    const orderId = `BILLING-${Date.now()}-${uuidv4().slice(0, 8)}`;
    const [payment] = await this.db
      .insert(payments)
      .values({ orderId, orderName: dto.orderName, amount: dto.amount, userId: dto.userId, bookingId: dto.bookingId, status: PaymentStatus.IN_PROGRESS, method: PaymentMethod.CARD })
      .returning();

    try {
      const tossResponse = await this.tossApi.billingPayment(dto.billingKey, dto.amount, dto.orderName, orderId, dto.customerKey);
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);
      await this.createOutboxEvent('payment.confirmed', {
        paymentId: updatedPayment.id, paymentKey: tossResponse.paymentKey, orderId, amount: dto.amount, bookingId: dto.bookingId, userId: dto.userId, isBilling: true,
      });
      this.logger.log(`Billing payment completed: ${orderId}`);
      return updatedPayment;
    } catch (error) {
      await this.db.update(payments).set({ status: PaymentStatus.ABORTED }).where(eq(payments.id, payment.id));
      throw error;
    }
  }

  async getPayment(paymentKey: string) {
    const payment = await this.db.query.payments.findFirst({ where: eq(payments.paymentKey, paymentKey), with: { refunds: true } });
    if (!payment) throw new AppException(Errors.Payment.NOT_FOUND);
    return payment;
  }

  async getPayments(filter: GetPaymentsFilterDto) {
    const { userId, bookingId, status, startDate, endDate, page = 1, limit = 20 } = filter;
    const conds = [];
    if (userId) conds.push(eq(payments.userId, userId));
    if (bookingId) conds.push(eq(payments.bookingId, bookingId));
    if (status) conds.push(eq(payments.status, status as PaymentStatus));
    if (startDate) conds.push(gte(payments.createdAt, new Date(startDate)));
    if (endDate) conds.push(lte(payments.createdAt, new Date(endDate)));
    const where = conds.length ? and(...conds) : undefined;

    const [data, totalRows] = await Promise.all([
      this.db.query.payments.findMany({ where, with: { refunds: true }, orderBy: desc(payments.createdAt), limit, offset: (page - 1) * limit }),
      this.db.select({ value: count() }).from(payments).where(where),
    ]);
    return { data, total: totalRows[0].value, page, limit };
  }

  async getPaymentByOrderId(orderId: string) {
    const payment = await this.db.query.payments.findFirst({ where: eq(payments.orderId, orderId), with: { refunds: true } });
    if (!payment) throw new AppException(Errors.Payment.NOT_FOUND);
    return payment;
  }

  async getUserBillingKeys(userId: number) {
    return this.db.select().from(billingKeys).where(and(eq(billingKeys.userId, userId), eq(billingKeys.isActive, true))).orderBy(desc(billingKeys.createdAt));
  }

  async deleteBillingKey(billingKey: string, userId: number) {
    const [record] = await this.db.select().from(billingKeys).where(eq(billingKeys.billingKey, billingKey)).limit(1);
    if (!record || record.userId !== userId) throw new AppException(Errors.Billing.KEY_NOT_FOUND);
    await this.db.update(billingKeys).set({ isActive: false }).where(eq(billingKeys.billingKey, billingKey));
    this.logger.log(`Billing key deleted: ${billingKey}`);
    return { success: true };
  }

  private async updatePaymentFromToss(paymentId: number, tossResponse: TossPaymentResponse) {
    const method = this.mapPaymentMethod(tossResponse.method);
    const [row] = await this.db
      .update(payments)
      .set({
        paymentKey: tossResponse.paymentKey,
        status: this.mapPaymentStatus(tossResponse.status),
        method,
        cardNumber: tossResponse.card?.number,
        cardCompany: tossResponse.card?.company,
        installmentMonths: tossResponse.card?.installmentPlanMonths,
        receiptUrl: tossResponse.receipt?.url || tossResponse.card?.receiptUrl,
        approvedAt: tossResponse.approvedAt ? new Date(tossResponse.approvedAt) : null,
        virtualAccountNumber: tossResponse.virtualAccount?.accountNumber,
        virtualBankCode: tossResponse.virtualAccount?.bank,
        virtualDueDate: tossResponse.virtualAccount?.dueDate ? new Date(tossResponse.virtualAccount.dueDate) : null,
      })
      .where(eq(payments.id, paymentId))
      .returning();
    return row;
  }

  private mapPaymentMethod(method?: string): PaymentMethod | null {
    if (!method) return null;
    const methodMap: Record<string, PaymentMethod> = {
      '카드': PaymentMethod.CARD,
      '가상계좌': PaymentMethod.VIRTUAL_ACCOUNT,
      '계좌이체': PaymentMethod.TRANSFER,
      '휴대폰': PaymentMethod.MOBILE,
      '간편결제': PaymentMethod.EASY_PAY,
    };
    return methodMap[method] || null;
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      READY: PaymentStatus.READY,
      IN_PROGRESS: PaymentStatus.IN_PROGRESS,
      WAITING_FOR_DEPOSIT: PaymentStatus.WAITING_FOR_DEPOSIT,
      DONE: PaymentStatus.DONE,
      CANCELED: PaymentStatus.CANCELED,
      PARTIAL_CANCELED: PaymentStatus.PARTIAL_CANCELED,
      ABORTED: PaymentStatus.ABORTED,
      EXPIRED: PaymentStatus.EXPIRED,
    };
    return statusMap[status] || PaymentStatus.READY;
  }

  async createOutboxEvent(eventType: string, payload: Record<string, unknown> & { paymentId: number | null }) {
    const [event] = await this.db
      .insert(paymentOutboxEvents)
      .values({ aggregateType: 'Payment', aggregateId: String(payload.paymentId), eventType, payload, status: OutboxStatus.PENDING })
      .returning();
    await this.triggerOutboxJob(event.id);
    return event;
  }

  async insertOutboxEvent(
    tx: DrizzleTx,
    eventType: string,
    payload: Record<string, unknown> & ({ paymentId: number } | { bookingId: number }),
  ) {
    const aggregateId = (payload as { paymentId?: number }).paymentId ?? (payload as { bookingId?: number }).bookingId ?? 0;
    const [event] = await tx
      .insert(paymentOutboxEvents)
      .values({ aggregateType: 'Payment', aggregateId: String(aggregateId), eventType, payload, status: OutboxStatus.PENDING })
      .returning();
    return event;
  }

  async triggerOutboxJob(eventId: number) {
    try {
      await this.pgboss.send('payment-outbox-publish', { outboxEventId: eventId }, { singletonKey: `outbox-${eventId}`, retryLimit: 5, retryBackoff: true });
    } catch (err) {
      this.logger.warn(`[Outbox] pg-boss send failed for event ${eventId}: ${err instanceof Error ? err.message : 'unknown'}. Will be picked up by backup poller.`);
    }
  }

  async processRefundByBooking(data: { bookingId: number; cancelAmount?: number; cancelReason: string }) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.bookingId, data.bookingId)).limit(1);
    if (!payment) throw new AppException(Errors.Payment.NOT_FOUND, `bookingId=${data.bookingId}에 대한 결제를 찾을 수 없습니다`);
    if (payment.status === PaymentStatus.CANCELED) throw new AppException(Errors.Payment.ALREADY_CANCELLED);
    if (payment.status !== PaymentStatus.DONE && payment.status !== PaymentStatus.PARTIAL_CANCELED) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '완료된 결제만 환불할 수 있습니다');
    }
    if (!payment.paymentKey) throw new AppException(Errors.Payment.INVALID_STATUS, '결제키가 없어 환불할 수 없습니다');
    return this.cancelPayment({ paymentKey: payment.paymentKey, cancelReason: data.cancelReason, cancelAmount: data.cancelAmount });
  }

  async getRevenueStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const approvedWhere = and(
      inArray(payments.status, [PaymentStatus.DONE, PaymentStatus.PARTIAL_CANCELED]),
      gte(payments.approvedAt, startDate),
      lte(payments.approvedAt, endDate),
    );

    const [paymentAgg, refundAgg] = await Promise.all([
      this.db.select({ sum: sum(payments.amount), count: count(), avg: avg(payments.amount) }).from(payments).where(approvedWhere),
      this.db
        .select({ sum: sum(refunds.cancelAmount) })
        .from(refunds)
        .innerJoin(payments, eq(refunds.paymentId, payments.id))
        .where(and(eq(refunds.refundStatus, RefundStatus.COMPLETED), gte(payments.approvedAt, startDate), lte(payments.approvedAt, endDate))),
    ]);

    const grossRevenue = num(paymentAgg[0].sum);
    const refundTotal = num(refundAgg[0].sum);
    const totalRevenue = grossRevenue - refundTotal;
    const transactionCount = paymentAgg[0].count;
    const averageRevenuePerBooking = Math.round(num(paymentAgg[0].avg));

    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs - 1);
    const prevEnd = new Date(startDate.getTime() - 1);

    const [prevPaymentAgg, prevRefundAgg] = await Promise.all([
      this.db.select({ sum: sum(payments.amount) }).from(payments).where(
        and(inArray(payments.status, [PaymentStatus.DONE, PaymentStatus.PARTIAL_CANCELED]), gte(payments.approvedAt, prevStart), lte(payments.approvedAt, prevEnd)),
      ),
      this.db
        .select({ sum: sum(refunds.cancelAmount) })
        .from(refunds)
        .innerJoin(payments, eq(refunds.paymentId, payments.id))
        .where(and(eq(refunds.refundStatus, RefundStatus.COMPLETED), gte(payments.approvedAt, prevStart), lte(payments.approvedAt, prevEnd))),
    ]);

    const prevRevenue = num(prevPaymentAgg[0].sum) - num(prevRefundAgg[0].sum);
    const revenueGrowthRate = prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100 * 10) / 10 : 0;
    const days = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const monthlyRecurringRevenue = Math.round((totalRevenue / days) * 30);

    return {
      totalRevenue, revenueGrowthRate, averageRevenuePerBooking, monthlyRecurringRevenue,
      transactionCount, refundTotal, total: totalRevenue, growth: revenueGrowthRate,
    };
  }

  async checkUserActivePayments(userId: number) {
    const [pendingPayments, pendingRefunds] = await Promise.all([
      this.db.select({ value: count() }).from(payments).where(and(eq(payments.userId, userId), inArray(payments.status, [PaymentStatus.READY, PaymentStatus.IN_PROGRESS, PaymentStatus.WAITING_FOR_DEPOSIT]))),
      this.db
        .select({ value: count() })
        .from(refunds)
        .innerJoin(payments, eq(refunds.paymentId, payments.id))
        .where(and(eq(payments.userId, userId), inArray(refunds.refundStatus, [RefundStatus.PENDING, RefundStatus.PROCESSING]))),
    ]);
    return { hasPendingPayment: pendingPayments[0].value > 0, hasPendingRefund: pendingRefunds[0].value > 0 };
  }

  async deleteUserBillingKeys(userId: number): Promise<number> {
    const rows = await this.db.update(billingKeys).set({ isActive: false }).where(and(eq(billingKeys.userId, userId), eq(billingKeys.isActive, true))).returning({ id: billingKeys.id });
    return rows.length;
  }
}
