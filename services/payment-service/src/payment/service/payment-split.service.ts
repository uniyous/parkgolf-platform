import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { eq, and, lt, asc } from 'drizzle-orm';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { DrizzleService } from '../../db/drizzle.service';
import { paymentSplits } from '../../db/schema';
import { SplitStatus } from '../../contracts/enums';
import { AppException, Errors } from '../../common/exceptions';
import { TossApiService } from './toss-api.service';
import { PaymentService } from './payment.service';
import { v4 as uuidv4 } from 'uuid';

export interface SplitPrepareDto {
  bookingGroupId?: number;
  bookingId: number;
  participants: Array<{ userId: number; userName: string; userEmail: string; amount: number }>;
  expirationMinutes?: number;
}

export interface SplitConfirmDto {
  orderId: string;
  paymentKey: string;
  amount: number;
}

@Injectable()
export class PaymentSplitService {
  private readonly logger = new Logger(PaymentSplitService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly tossApi: TossApiService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    private readonly paymentService: PaymentService,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async prepareSplit(dto: SplitPrepareDto) {
    const expirationMinutes = dto.expirationMinutes || 3;
    const expiredAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const splits = await this.db.transaction(async (tx) => {
      const out = [];
      for (const p of dto.participants) {
        const [s] = await tx
          .insert(paymentSplits)
          .values({
            bookingGroupId: dto.bookingGroupId,
            bookingId: dto.bookingId,
            userId: p.userId,
            userName: p.userName,
            userEmail: p.userEmail,
            amount: p.amount,
            status: SplitStatus.PENDING,
            orderId: `SPL-${Date.now()}-${uuidv4().slice(0, 8)}`,
            expiredAt,
          })
          .returning();
        out.push(s);
      }
      return out;
    });

    this.logger.log(`Split prepared: ${splits.length} splits for booking ${dto.bookingId}`);
    return {
      bookingId: dto.bookingId,
      bookingGroupId: dto.bookingGroupId,
      splits: splits.map((s) => ({ id: s.id, userId: s.userId, userName: s.userName, amount: s.amount, orderId: s.orderId, status: s.status, expiredAt: s.expiredAt })),
    };
  }

  async confirmSplit(dto: SplitConfirmDto) {
    const [split] = await this.db.select().from(paymentSplits).where(eq(paymentSplits.orderId, dto.orderId)).limit(1);
    if (!split) throw new AppException(Errors.Split.NOT_FOUND);
    if (split.status === SplitStatus.PAID) throw new AppException(Errors.Split.ALREADY_PAID);
    if (split.status !== SplitStatus.PENDING) throw new AppException(Errors.Split.INVALID_STATUS);
    if (split.expiredAt && new Date() > split.expiredAt) throw new AppException(Errors.Split.EXPIRED);
    if (split.amount !== dto.amount) {
      throw new AppException(Errors.Payment.AMOUNT_MISMATCH, `예상 금액: ${split.amount}원, 요청 금액: ${dto.amount}원`);
    }

    const tossResult = await this.tossApi.confirmPayment(dto.paymentKey, dto.orderId, dto.amount);
    if (tossResult.status !== 'DONE') {
      this.logger.warn(`Split payment not confirmed by Toss: orderId=${dto.orderId}, status=${tossResult.status}`);
      throw new AppException(Errors.Payment.INVALID_STATUS, `토스 결제 상태가 유효하지 않습니다: ${tossResult.status}`);
    }

    const [updated] = await this.db
      .update(paymentSplits)
      .set({ status: SplitStatus.PAID, paidAt: new Date(), paymentKey: dto.paymentKey })
      .where(eq(paymentSplits.id, split.id))
      .returning();

    const markRes = await firstValueFrom(
      this.bookingClient
        .send('booking.participant.paid', { bookingId: split.bookingId, userId: split.userId, userName: split.userName, userEmail: split.userEmail, amount: split.amount })
        .pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(`markParticipantPaid failed: ${err?.message || err}`);
            return of({ success: false, data: { settled: false } } as any);
          }),
        ),
    );

    this.logger.log(`Split confirmed: orderId=${dto.orderId}, user=${split.userId}, settled=${markRes?.data?.settled}`);

    if (markRes?.success && markRes?.data?.settled === true) {
      await this.paymentService.createOutboxEvent('payment.confirmed', {
        paymentId: null,
        paymentKey: null,
        orderId: null,
        amount: markRes.data?.amount ?? split.amount,
        bookingId: split.bookingId,
        userId: markRes.data?.userId ?? split.userId,
        splitPayment: true,
      });
      this.logger.log(`[Outbox] payment.confirmed emitted for split-payment booking=${split.bookingId}`);
    }

    return { id: updated.id, orderId: updated.orderId, userId: updated.userId, amount: updated.amount, status: updated.status, paidAt: updated.paidAt };
  }

  async getSplitsByBookingGroup(bookingGroupId: number) {
    const splits = await this.db.select().from(paymentSplits).where(eq(paymentSplits.bookingGroupId, bookingGroupId)).orderBy(asc(paymentSplits.createdAt));
    const paidCount = splits.filter((s) => s.status === SplitStatus.PAID).length;
    return {
      bookingGroupId,
      total: splits.length,
      paidCount,
      pendingCount: splits.length - paidCount,
      allPaid: paidCount === splits.length,
      splits: splits.map((s) => ({ id: s.id, userId: s.userId, userName: s.userName, amount: s.amount, orderId: s.orderId, status: s.status, paidAt: s.paidAt, expiredAt: s.expiredAt })),
    };
  }

  async getSplitsByBooking(bookingId: number) {
    const splits = await this.db.select().from(paymentSplits).where(eq(paymentSplits.bookingId, bookingId)).orderBy(asc(paymentSplits.createdAt));
    const paidCount = splits.filter((s) => s.status === SplitStatus.PAID).length;
    return {
      bookingId,
      total: splits.length,
      paidCount,
      pendingCount: splits.length - paidCount,
      allPaid: paidCount === splits.length,
      splits: splits.map((s) => ({ id: s.id, userId: s.userId, userName: s.userName, amount: s.amount, orderId: s.orderId, status: s.status, paidAt: s.paidAt, expiredAt: s.expiredAt })),
    };
  }

  async getSplitsByOrderId(orderId: string) {
    const [split] = await this.db.select().from(paymentSplits).where(eq(paymentSplits.orderId, orderId)).limit(1);
    if (!split) throw new AppException(Errors.Split.NOT_FOUND);
    return this.getSplitsByBooking(split.bookingId);
  }

  async expirePendingSplits() {
    const rows = await this.db
      .update(paymentSplits)
      .set({ status: SplitStatus.EXPIRED })
      .where(and(eq(paymentSplits.status, SplitStatus.PENDING), lt(paymentSplits.expiredAt, new Date())))
      .returning({ id: paymentSplits.id });
    if (rows.length > 0) this.logger.log(`Expired ${rows.length} pending splits`);
    return { expiredCount: rows.length };
  }

  async refundPaidSplitsByBooking(data: { bookingId: number; reason?: string }) {
    const splits = await this.db.query.paymentSplits.findMany({ where: eq(paymentSplits.bookingId, data.bookingId), with: { payment: true } });
    if (splits.length === 0) {
      this.logger.warn(`No splits found for booking ${data.bookingId}`);
      return { refundedCount: 0, expiredCount: 0, refundedAmount: 0, failedCount: 0 };
    }

    const reason = data.reason || '결제 타임아웃 - 분할결제 미완료로 자동 환불';
    let refundedCount = 0;
    let refundedAmount = 0;
    let failedCount = 0;
    const failures: Array<{ orderId: string; error: string }> = [];

    for (const split of splits) {
      if (split.status !== SplitStatus.PAID) continue;
      const paymentKey = split.paymentKey ?? split.payment?.paymentKey;
      if (!paymentKey) {
        this.logger.error(`Split ${split.id} (orderId=${split.orderId}) has no paymentKey - cannot refund via Toss`);
        failedCount++;
        failures.push({ orderId: split.orderId, error: 'no_paymentKey' });
        continue;
      }
      try {
        await this.tossApi.cancelPayment(paymentKey, reason, split.amount);
        await this.db.update(paymentSplits).set({ status: SplitStatus.REFUNDED }).where(eq(paymentSplits.id, split.id));
        refundedCount++;
        refundedAmount += split.amount;
        this.logger.log(`Split refunded: orderId=${split.orderId}, user=${split.userId}, amount=${split.amount}`);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Split refund failed: orderId=${split.orderId}, err=${errMsg}`);
        failedCount++;
        failures.push({ orderId: split.orderId, error: errMsg });
      }
    }

    const expiredRows = await this.db
      .update(paymentSplits)
      .set({ status: SplitStatus.EXPIRED })
      .where(and(eq(paymentSplits.bookingId, data.bookingId), eq(paymentSplits.status, SplitStatus.PENDING)))
      .returning({ id: paymentSplits.id });

    this.logger.log(`refundPaidSplitsByBooking(${data.bookingId}): refunded=${refundedCount}, amount=${refundedAmount}, expired=${expiredRows.length}, failed=${failedCount}`);

    if (failedCount > 0) {
      throw new AppException(Errors.Refund.REFUND_FAILED, `분할결제 환불 일부 실패: ${failedCount}건. failures=${JSON.stringify(failures)}`);
    }

    return { bookingId: data.bookingId, refundedCount, refundedAmount, expiredCount: expiredRows.length, failedCount };
  }

  async refundSingleSplit(data: {
    bookingId: number;
    userId: number;
    reason?: string;
    clubId?: number | null;
    companyId?: number | null;
    bookingDate?: string | Date;
    startTime?: string;
  }): Promise<{ orderId: string; refundedAmount: number; refundRate: number; splitAmount: number; paymentKey: string }> {
    const split = await this.db.query.paymentSplits.findFirst({
      where: and(eq(paymentSplits.bookingId, data.bookingId), eq(paymentSplits.userId, data.userId)),
      with: { payment: true },
    });
    if (!split) throw new AppException(Errors.Refund.NOT_FOUND, `PaymentSplit not found: booking=${data.bookingId} user=${data.userId}`);
    if (split.status !== SplitStatus.PAID) {
      throw new AppException(Errors.Refund.REFUND_FAILED, `Cannot refund split with status=${split.status} (orderId=${split.orderId})`);
    }
    const paymentKey = split.paymentKey ?? split.payment?.paymentKey;
    if (!paymentKey) throw new AppException(Errors.Refund.REFUND_FAILED, `Split ${split.orderId} has no paymentKey`);

    const refundRate = await this.resolveRefundRate({ clubId: data.clubId ?? undefined, companyId: data.companyId ?? undefined, bookingDate: data.bookingDate, startTime: data.startTime });
    const refundedAmount = Math.floor((split.amount * refundRate) / 100);
    const reason = data.reason || '본인 자리 취소 (마이페이지)';

    if (refundedAmount > 0) {
      await this.tossApi.cancelPayment(paymentKey, reason, refundedAmount);
    } else {
      this.logger.warn(`Refund rate=0%, skipping Toss call: orderId=${split.orderId}, user=${split.userId}`);
    }

    await this.db.update(paymentSplits).set({ status: SplitStatus.REFUNDED }).where(eq(paymentSplits.id, split.id));
    this.logger.log(`Split refunded (single): orderId=${split.orderId} user=${split.userId} amount=${split.amount} rate=${refundRate}% refunded=${refundedAmount}`);
    return { orderId: split.orderId, refundedAmount, refundRate, splitAmount: split.amount, paymentKey };
  }

  private async resolveRefundRate(args: { clubId?: number; companyId?: number; bookingDate?: string | Date; startTime?: string }): Promise<number> {
    let policy: any = null;
    try {
      const res: any = await firstValueFrom(
        this.bookingClient.send('policy.refund.resolve', { clubId: args.clubId, companyId: args.companyId }).pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.warn(`policy.refund.resolve failed: ${err?.message || err}`);
            return of(null);
          }),
        ),
      );
      policy = res?.data ?? res;
    } catch (err) {
      this.logger.warn(`policy.refund.resolve threw: ${(err as Error)?.message}`);
    }

    if (!policy || !Array.isArray(policy.tiers) || policy.tiers.length === 0) {
      this.logger.warn('No refund policy/tiers — falling back to 100% refund');
      return 100;
    }
    if (!args.bookingDate || !args.startTime) {
      this.logger.warn('bookingDate/startTime missing — falling back to 100% refund');
      return 100;
    }

    const startDateTime = this.composeStartDateTime(args.bookingDate, args.startTime);
    const hoursBefore = Math.max(0, (startDateTime.getTime() - Date.now()) / 3600_000);
    for (const tier of policy.tiers) {
      const min = tier.minHoursBefore ?? 0;
      const max = tier.maxHoursBefore;
      if (hoursBefore >= min && (max == null || hoursBefore < max)) {
        return tier.refundRate ?? 0;
      }
    }
    return 0;
  }

  private composeStartDateTime(bookingDate: string | Date, startTime: string): Date {
    const datePart = bookingDate instanceof Date ? bookingDate.toISOString().slice(0, 10) : String(bookingDate).slice(0, 10);
    const timePart = /^\d{2}:\d{2}(:\d{2})?$/.test(startTime) ? startTime : '00:00';
    return new Date(`${datePart}T${timePart.length === 5 ? timePart + ':00' : timePart}`);
  }
}
