import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Prisma, PaymentStatus, PaymentMethod, RefundStatus, OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
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

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tossApi: TossApiService,
    private readonly pgboss: PgBossService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  /**
   * 결제 준비 (orderId 생성)
   */
  async preparePayment(dto: PreparePaymentDto) {
    const orderId = `ORD-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        orderName: dto.orderName,
        amount: dto.amount,
        userId: dto.userId,
        bookingId: dto.bookingId,
        status: PaymentStatus.READY,
        metadata: (dto.metadata as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });

    this.logger.log(`Payment prepared: ${orderId} for user ${dto.userId}`);

    return {
      paymentId: payment.id,
      orderId: payment.orderId,
      amount: payment.amount,
      orderName: payment.orderName,
    };
  }

  /**
   * 결제 승인
   */
  async confirmPayment(dto: ConfirmPaymentDto) {
    // 1. 결제 정보 조회 및 검증
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    if (payment.status !== PaymentStatus.READY) {
      throw new AppException(Errors.Payment.INVALID_STATUS, `현재 상태: ${payment.status}`);
    }

    if (payment.amount !== dto.amount) {
      throw new AppException(
        Errors.Payment.AMOUNT_MISMATCH,
        `예상 금액: ${payment.amount}원, 요청 금액: ${dto.amount}원`,
      );
    }

    // 2. 결제 상태를 IN_PROGRESS로 변경 + paymentKey 사전 저장
    //    (reconcile 잡이 토스 getPayment(paymentKey)로 조회하려면 미리 기록 필요)
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.IN_PROGRESS,
        paymentKey: dto.paymentKey,
      },
    });

    // 3. 5분 후 reconcile 잡 schedule (토스 응답 못 받는 경우 안전망)
    await this.scheduleReconcile(payment.id);

    try {
      // 4. 토스페이먼츠 승인 API 호출
      const tossResponse = await this.tossApi.confirmPayment(
        dto.paymentKey,
        dto.orderId,
        dto.amount,
      );

      // 5. 결제 정보 업데이트
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);

      // 6. Outbox 이벤트 저장 (booking-service에 알림)
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
      // 네트워크 불명 (TIMEOUT/UNAVAILABLE)은 ABORTED 단정 금지 — reconcile에 위임
      if (this.isNetworkUncertainError(error)) {
        this.logger.warn(
          `[confirmPayment] network uncertain, deferring to reconcile: ${dto.orderId}`,
        );
        throw error;
      }

      // 명시적 실패 → ABORTED + booking.paymentFailed outbox 발행
      await this.markPaymentAborted(payment.id, {
        reason: 'confirm_failed',
        errorMessage: error instanceof Error ? error.message : undefined,
      });
      throw error;
    }
  }

  /**
   * 5분 후 reconcile 잡 schedule
   * 정상 완료(DONE) 또는 명시적 실패(ABORTED) 시엔 worker가 알아서 skip하므로 cancel 불필요
   */
  private async scheduleReconcile(paymentId: number) {
    try {
      await this.pgboss.send(
        'payment-reconcile',
        { paymentId },
        {
          startAfter: 300, // 5분
          singletonKey: `reconcile-${paymentId}`,
          retryLimit: 3,
          retryBackoff: true,
        },
      );
    } catch (err) {
      this.logger.warn(
        `[Reconcile] schedule failed for payment ${paymentId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * 토스 호출 결과가 "응답 못 받음/불명" 인지 판정
   * - TIMEOUT/UNAVAILABLE은 토스가 처리했는지 알 수 없으므로 ABORTED 단정 금지
   */
  private isNetworkUncertainError(error: unknown): boolean {
    if (error instanceof AppException) {
      return (
        error.code === Errors.External.UNAVAILABLE.code ||
        error.code === Errors.External.TIMEOUT.code
      );
    }
    return false;
  }

  /**
   * 결제 상태 reconcile (pg-boss worker가 호출)
   *
   * IN_PROGRESS 정체나 네트워크 불명 케이스에서, 토스 getPayment로 실제 상태를 조회해
   * DB 상태와 outbox를 정정한다.
   */
  async reconcilePayment(paymentId: number): Promise<unknown> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      return { skipped: true, reason: 'not_found' };
    }

    // 이미 종결 상태면 skip (정상 완료/실패한 결제는 reconcile 불필요)
    const terminalStatuses: PaymentStatus[] = [
      PaymentStatus.DONE,
      PaymentStatus.CANCELED,
      PaymentStatus.PARTIAL_CANCELED,
      PaymentStatus.ABORTED,
      PaymentStatus.EXPIRED,
    ];
    if (terminalStatuses.includes(payment.status)) {
      return { skipped: true, currentStatus: payment.status };
    }

    // paymentKey 없으면 토스 조회 불가 → 자동 ABORT (위젯조차 안 띄우고 5분 경과)
    if (!payment.paymentKey) {
      this.logger.warn(`[Reconcile] payment ${paymentId} has no paymentKey, marking ABORTED`);
      await this.markPaymentAborted(payment.id, {
        reason: 'reconcile_no_payment_key',
        errorMessage: 'paymentKey not recorded before reconcile',
      });
      return { handled: 'aborted_no_key' };
    }

    // 토스에 실제 상태 조회
    const tossPayment = await this.tossApi.getPayment(payment.paymentKey);
    this.logger.log(
      `[Reconcile] payment ${paymentId}, toss status=${tossPayment.status}`,
    );

    switch (tossPayment.status) {
      case 'DONE': {
        await this.updatePaymentFromToss(payment.id, tossPayment);
        await this.createOutboxEvent('payment.confirmed', {
          paymentId: payment.id,
          paymentKey: payment.paymentKey,
          orderId: payment.orderId,
          amount: payment.amount,
          bookingId: payment.bookingId,
          userId: payment.userId,
        });
        return { handled: 'reconciled_done' };
      }
      case 'ABORTED':
      case 'EXPIRED': {
        await this.markPaymentAborted(payment.id, {
          reason: `toss_${tossPayment.status.toLowerCase()}`,
          errorMessage: `Toss reported ${tossPayment.status} during reconcile`,
        });
        return { handled: `reconciled_${tossPayment.status.toLowerCase()}` };
      }
      case 'CANCELED':
      case 'PARTIAL_CANCELED': {
        // 토스 콘솔 직접 취소 등 — 상태만 동기화
        await this.prisma.payment.update({
          where: { id: payment.id },
          data: { status: this.mapPaymentStatus(tossPayment.status) },
        });
        return { handled: `synced_${tossPayment.status.toLowerCase()}` };
      }
      case 'WAITING_FOR_DEPOSIT':
        // 가상계좌 입금 대기 — webhook이 처리하므로 skip
        return { skipped: true, currentStatus: tossPayment.status };
      case 'IN_PROGRESS':
      case 'READY':
        // 토스 측이 아직 미확정 — pg-boss retry로 재시도
        throw new Error(`Toss status still pending: ${tossPayment.status}`);
      default:
        this.logger.warn(`[Reconcile] unexpected toss status: ${tossPayment.status}`);
        throw new Error(`unexpected toss status: ${tossPayment.status}`);
    }
  }

  /**
   * 결제 중단 (실패/취소) - orderId 기반
   * 클라이언트가 결제창 onFail/onCancel 시 호출.
   * 멱등성 보장 (이미 ABORTED면 outbox 재발행 없이 성공 응답).
   */
  async abandonPaymentByOrderId(data: {
    orderId: string;
    reason: 'failed' | 'cancelled';
    errorCode?: string;
    errorMessage?: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    // 멱등성: 이미 ABORTED면 그대로 반환
    if (payment.status === PaymentStatus.ABORTED) {
      this.logger.log(`Payment already ABORTED: ${data.orderId} (idempotent)`);
      return payment;
    }

    // 결제 완료된 건은 abandon 불가 (취소 saga로 처리)
    if (payment.status === PaymentStatus.DONE) {
      throw new AppException(
        Errors.Payment.INVALID_STATUS,
        '이미 결제 완료된 건은 취소 saga로 처리해야 합니다',
      );
    }

    return this.markPaymentAborted(payment.id, {
      reason: data.reason,
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
    });
  }

  /**
   * payment.status=ABORTED + booking.paymentFailed outbox 이벤트 발행 (단일 트랜잭션)
   * 트랜잭션 commit 후 pg-boss 트리거 (commit 전 worker가 깨면 row 못 찾는 race 방지)
   */
  private async markPaymentAborted(
    paymentId: number,
    meta: { reason: string; errorCode?: string; errorMessage?: string },
  ) {
    const { payment, outboxEventId } = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: PaymentStatus.ABORTED },
      });

      if (!updated.bookingId) {
        this.logger.warn(`Payment ABORTED without bookingId: ${updated.orderId}`);
        return { payment: updated, outboxEventId: undefined };
      }

      const event = await this.insertOutboxEvent(tx, 'payment.failed', {
        paymentId: updated.id,
        bookingId: updated.bookingId,
        orderId: updated.orderId,
        userId: updated.userId,
        reason: meta.reason,
        errorCode: meta.errorCode,
        errorMessage: meta.errorMessage,
      });
      this.logger.log(`Payment ABORTED + outbox: ${updated.orderId} (booking ${updated.bookingId})`);
      return { payment: updated, outboxEventId: event.id };
    });

    if (outboxEventId !== undefined) {
      await this.triggerOutboxJob(outboxEventId);
    }

    return payment;
  }

  /**
   * 결제 취소
   */
  async cancelPayment(dto: CancelPaymentDto) {
    // 1. 결제 정보 조회
    const payment = await this.prisma.payment.findUnique({
      where: { paymentKey: dto.paymentKey },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    if (payment.status === PaymentStatus.CANCELED) {
      throw new AppException(Errors.Payment.ALREADY_CANCELLED);
    }

    if (payment.status !== PaymentStatus.DONE && payment.status !== PaymentStatus.PARTIAL_CANCELED) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '완료된 결제만 취소할 수 있습니다');
    }

    // 2. 부분 취소 금액 검증
    if (dto.cancelAmount) {
      const existingRefunds = await this.prisma.refund.aggregate({
        where: { paymentId: payment.id },
        _sum: { cancelAmount: true },
      });
      const totalRefunded = existingRefunds._sum.cancelAmount || 0;
      const remainingAmount = payment.amount - totalRefunded;

      if (dto.cancelAmount > remainingAmount) {
        throw new AppException(
          Errors.Refund.EXCEED_AMOUNT,
          `환불 가능 금액: ${remainingAmount}원`,
        );
      }
    }

    // 3. 토스페이먼츠 취소 API 호출
    const tossResponse = await this.tossApi.cancelPayment(
      dto.paymentKey,
      dto.cancelReason,
      dto.cancelAmount,
      dto.refundReceiveAccount,
    );

    // 4. 환불 정보 저장
    const latestCancel = tossResponse.cancels?.[tossResponse.cancels.length - 1];
    if (latestCancel) {
      await this.prisma.refund.create({
        data: {
          paymentId: payment.id,
          transactionKey: latestCancel.transactionKey,
          cancelAmount: latestCancel.cancelAmount,
          cancelReason: latestCancel.cancelReason,
          refundStatus: RefundStatus.COMPLETED,
          refundedAt: new Date(latestCancel.canceledAt),
        },
      });
    }

    // 5. 결제 상태 업데이트
    const newStatus = dto.cancelAmount
      ? PaymentStatus.PARTIAL_CANCELED
      : PaymentStatus.CANCELED;

    const updatedPayment = await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: newStatus },
    });

    // 6. Outbox 이벤트 저장
    await this.createOutboxEvent('payment.canceled', {
      paymentId: payment.id,
      paymentKey: dto.paymentKey,
      cancelAmount: dto.cancelAmount || payment.amount,
      bookingId: payment.bookingId,
      userId: payment.userId,
    });

    this.logger.log(`Payment canceled: ${dto.paymentKey}`);

    return updatedPayment;
  }

  /**
   * bookingId 기반 결제 취소 (예약 취소 시 자동 환불)
   * 멱등성 보장: payment 없음/이미 취소됨/상태 불일치 시 skip 반환
   */
  async cancelPaymentByBookingId(data: { bookingId: number; cancelReason: string }) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: data.bookingId },
    });

    // 멱등성: payment 없음 → skip
    if (!payment) {
      this.logger.warn(`No payment found for bookingId=${data.bookingId}, skipping refund`);
      return { skipped: true, reason: 'Payment not found' };
    }

    // 멱등성: 이미 취소됨 → skip
    if (payment.status === PaymentStatus.CANCELED || payment.status === PaymentStatus.PARTIAL_CANCELED) {
      this.logger.warn(`Payment for bookingId=${data.bookingId} already canceled (status=${payment.status}), skipping`);
      return { skipped: true, reason: 'Already canceled' };
    }

    // 멱등성: DONE이 아님 → skip
    if (payment.status !== PaymentStatus.DONE) {
      this.logger.warn(`Payment for bookingId=${data.bookingId} not in DONE status (status=${payment.status}), skipping refund`);
      return { skipped: true, reason: `Invalid status: ${payment.status}` };
    }

    // paymentKey 필수 확인
    if (!payment.paymentKey) {
      this.logger.error(`Payment for bookingId=${data.bookingId} has no paymentKey, cannot cancel`);
      return { skipped: true, reason: 'No paymentKey' };
    }

    // 기존 cancelPayment 재사용
    const result = await this.cancelPayment({
      paymentKey: payment.paymentKey,
      cancelReason: data.cancelReason,
    });

    this.logger.log(`Payment canceled for bookingId=${data.bookingId}, paymentKey=${payment.paymentKey}`);
    return result;
  }

  /**
   * 빌링키 발급
   */
  async issueBillingKey(dto: IssueBillingKeyDto) {
    // 기존 빌링키 확인
    const existing = await this.prisma.billingKey.findFirst({
      where: {
        customerKey: dto.customerKey,
        isActive: true,
      },
    });

    if (existing) {
      throw new AppException(Errors.Billing.KEY_ALREADY_EXISTS);
    }

    // 토스페이먼츠 빌링키 발급 API 호출
    const tossResponse = await this.tossApi.issueBillingKey(dto.authKey, dto.customerKey);

    // 빌링키 저장
    const billingKey = await this.prisma.billingKey.create({
      data: {
        billingKey: tossResponse.billingKey,
        customerKey: tossResponse.customerKey,
        userId: dto.userId,
        authenticatedAt: new Date(tossResponse.authenticatedAt),
        cardNumber: tossResponse.card.number,
        cardCompany: tossResponse.card.company,
        cardType: tossResponse.card.cardType,
        isActive: true,
      },
    });

    this.logger.log(`Billing key issued for user ${dto.userId}`);

    return billingKey;
  }

  /**
   * 빌링 결제 (자동결제)
   */
  async billingPayment(dto: BillingPaymentDto) {
    // 빌링키 조회
    const billingKeyRecord = await this.prisma.billingKey.findUnique({
      where: { billingKey: dto.billingKey },
    });

    if (!billingKeyRecord || !billingKeyRecord.isActive) {
      throw new AppException(Errors.Billing.KEY_NOT_FOUND);
    }

    // 결제 준비
    const orderId = `BILLING-${Date.now()}-${uuidv4().slice(0, 8)}`;

    const payment = await this.prisma.payment.create({
      data: {
        orderId,
        orderName: dto.orderName,
        amount: dto.amount,
        userId: dto.userId,
        bookingId: dto.bookingId,
        status: PaymentStatus.IN_PROGRESS,
        method: PaymentMethod.CARD,
      },
    });

    try {
      // 토스페이먼츠 빌링 결제 API 호출
      const tossResponse = await this.tossApi.billingPayment(
        dto.billingKey,
        dto.amount,
        dto.orderName,
        orderId,
        dto.customerKey,
      );

      // 결제 정보 업데이트
      const updatedPayment = await this.updatePaymentFromToss(payment.id, tossResponse);

      // Outbox 이벤트 저장
      await this.createOutboxEvent('payment.confirmed', {
        paymentId: updatedPayment.id,
        paymentKey: tossResponse.paymentKey,
        orderId,
        amount: dto.amount,
        bookingId: dto.bookingId,
        userId: dto.userId,
        isBilling: true,
      });

      this.logger.log(`Billing payment completed: ${orderId}`);

      return updatedPayment;
    } catch (error) {
      // 결제 실패 시 상태 업데이트
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PaymentStatus.ABORTED },
      });
      throw error;
    }
  }

  /**
   * 결제 조회
   */
  async getPayment(paymentKey: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { paymentKey },
      include: {
        refunds: true,
      },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    return payment;
  }

  /**
   * 결제 목록 조회
   */
  async getPayments(filter: GetPaymentsFilterDto) {
    const { userId, bookingId, status, startDate, endDate, page = 1, limit = 20 } = filter;

    const where: Prisma.PaymentWhereInput = {};
    if (userId) where.userId = userId;
    if (bookingId) where.bookingId = bookingId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      };
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: { refunds: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      total,
      page,
      limit,
    };
  }

  /**
   * orderId로 결제 조회
   */
  async getPaymentByOrderId(orderId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId },
      include: { refunds: true },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND);
    }

    return payment;
  }

  /**
   * 사용자 빌링키 목록 조회
   */
  async getUserBillingKeys(userId: number) {
    return this.prisma.billingKey.findMany({
      where: {
        userId,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 빌링키 삭제 (비활성화)
   */
  async deleteBillingKey(billingKey: string, userId: number) {
    const record = await this.prisma.billingKey.findUnique({
      where: { billingKey },
    });

    if (!record || record.userId !== userId) {
      throw new AppException(Errors.Billing.KEY_NOT_FOUND);
    }

    await this.prisma.billingKey.update({
      where: { billingKey },
      data: { isActive: false },
    });

    this.logger.log(`Billing key deleted: ${billingKey}`);

    return { success: true };
  }

  /**
   * 토스 응답으로 결제 정보 업데이트
   */
  private async updatePaymentFromToss(paymentId: number, tossResponse: TossPaymentResponse) {
    const method = this.mapPaymentMethod(tossResponse.method);

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
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
        virtualDueDate: tossResponse.virtualAccount?.dueDate
          ? new Date(tossResponse.virtualAccount.dueDate)
          : null,
      },
    });
  }

  /**
   * 결제 수단 매핑
   */
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

  /**
   * 결제 상태 매핑
   */
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

  /**
   * Outbox 이벤트 생성 + pg-boss 즉시 트리거
   *
   * 흐름:
   *   1. PaymentOutboxEvent INSERT (트랜잭션 안전성 확보)
   *   2. pg-boss send로 worker 즉시 트리거 (~수ms 지연)
   *   3. worker가 NATS publish → status=SENT 업데이트
   *
   * 트랜잭션 안에서 호출해야 한다면 insertOutboxEvent + triggerOutboxJob을 분리해서 사용.
   *
   * TODO: pg-boss send 실패 시 OutboxEvent가 PENDING으로 영구히 남음.
   *       backup poller 또는 pg-boss recurring schedule로 안전망 보완 필요.
   */
  async createOutboxEvent(
    eventType: string,
    payload: Record<string, unknown> & { paymentId: number },
  ) {
    const event = await this.prisma.paymentOutboxEvent.create({
      data: {
        aggregateType: 'Payment',
        aggregateId: String(payload.paymentId),
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: OutboxStatus.PENDING,
      },
    });

    await this.triggerOutboxJob(event.id);
    return event;
  }

  /**
   * 트랜잭션 클라이언트로 outbox row INSERT만 수행 (pg-boss 트리거는 별도)
   * 호출자: 트랜잭션 commit 후 반드시 triggerOutboxJob(event.id)을 이어 호출해야 함.
   */
  async insertOutboxEvent(
    tx: Prisma.TransactionClient,
    eventType: string,
    payload: Record<string, unknown> & { paymentId: number },
  ) {
    return tx.paymentOutboxEvent.create({
      data: {
        aggregateType: 'Payment',
        aggregateId: String(payload.paymentId),
        eventType,
        payload: payload as Prisma.InputJsonValue,
        status: OutboxStatus.PENDING,
      },
    });
  }

  /**
   * pg-boss로 outbox worker 즉시 트리거.
   * 실패해도 throw 안 함 (backup poller 보완 예정).
   */
  async triggerOutboxJob(eventId: number) {
    try {
      await this.pgboss.send(
        'payment-outbox-publish',
        { outboxEventId: eventId },
        {
          singletonKey: `outbox-${eventId}`,
          retryLimit: 5,
          retryBackoff: true,
        },
      );
    } catch (err) {
      this.logger.warn(
        `[Outbox] pg-boss send failed for event ${eventId}: ${err instanceof Error ? err.message : 'unknown'}. Will be picked up by backup poller.`,
      );
    }
  }

  /**
   * 관리자 환불 처리 (bookingId 기반)
   * 전체 환불: cancelAmount 생략
   * 부분 환불: cancelAmount 지정
   */
  async processRefundByBooking(data: {
    bookingId: number;
    cancelAmount?: number;
    cancelReason: string;
  }) {
    const payment = await this.prisma.payment.findUnique({
      where: { bookingId: data.bookingId },
    });

    if (!payment) {
      throw new AppException(Errors.Payment.NOT_FOUND, `bookingId=${data.bookingId}에 대한 결제를 찾을 수 없습니다`);
    }

    if (payment.status === PaymentStatus.CANCELED) {
      throw new AppException(Errors.Payment.ALREADY_CANCELLED);
    }

    if (payment.status !== PaymentStatus.DONE && payment.status !== PaymentStatus.PARTIAL_CANCELED) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '완료된 결제만 환불할 수 있습니다');
    }

    if (!payment.paymentKey) {
      throw new AppException(Errors.Payment.INVALID_STATUS, '결제키가 없어 환불할 수 없습니다');
    }

    return this.cancelPayment({
      paymentKey: payment.paymentKey,
      cancelReason: data.cancelReason,
      cancelAmount: data.cancelAmount,
    });
  }

  /**
   * 관리자 대시보드 - 매출 통계
   */
  async getRevenueStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);

    const approvedFilter: Prisma.PaymentWhereInput = {
      status: { in: [PaymentStatus.DONE, PaymentStatus.PARTIAL_CANCELED] },
      approvedAt: { gte: startDate, lte: endDate },
    };

    const [paymentAgg, refundAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: approvedFilter,
        _sum: { amount: true },
        _count: { id: true },
        _avg: { amount: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          payment: { approvedAt: { gte: startDate, lte: endDate } },
          refundStatus: RefundStatus.COMPLETED,
        },
        _sum: { cancelAmount: true },
      }),
    ]);

    const grossRevenue = paymentAgg._sum.amount ?? 0;
    const refundTotal = refundAgg._sum.cancelAmount ?? 0;
    const totalRevenue = grossRevenue - refundTotal;
    const transactionCount = paymentAgg._count.id;
    const averageRevenuePerBooking = Math.round(paymentAgg._avg.amount ?? 0);

    // 이전 동일 기간 계산
    const periodMs = endDate.getTime() - startDate.getTime();
    const prevStart = new Date(startDate.getTime() - periodMs - 1);
    const prevEnd = new Date(startDate.getTime() - 1);

    const [prevPaymentAgg, prevRefundAgg] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          status: { in: [PaymentStatus.DONE, PaymentStatus.PARTIAL_CANCELED] },
          approvedAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.refund.aggregate({
        where: {
          payment: { approvedAt: { gte: prevStart, lte: prevEnd } },
          refundStatus: RefundStatus.COMPLETED,
        },
        _sum: { cancelAmount: true },
      }),
    ]);

    const prevRevenue = (prevPaymentAgg._sum.amount ?? 0) - (prevRefundAgg._sum.cancelAmount ?? 0);
    const revenueGrowthRate = prevRevenue > 0
      ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100 * 10) / 10
      : 0;

    const days = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const monthlyRecurringRevenue = Math.round((totalRevenue / days) * 30);

    return {
      totalRevenue,
      revenueGrowthRate,
      averageRevenuePerBooking,
      monthlyRecurringRevenue,
      transactionCount,
      refundTotal,
      total: totalRevenue,
      growth: revenueGrowthRate,
    };
  }

  /**
   * 미결제/환불 진행중 확인 (계정 삭제 제한 조건)
   */
  async checkUserActivePayments(userId: number) {
    const [pendingPayments, pendingRefunds] = await Promise.all([
      this.prisma.payment.count({
        where: {
          userId,
          status: { in: ['READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT'] },
        },
      }),
      this.prisma.refund.count({
        where: {
          payment: { userId },
          refundStatus: { in: ['PENDING', 'PROCESSING'] },
        },
      }),
    ]);

    return {
      hasPendingPayment: pendingPayments > 0,
      hasPendingRefund: pendingRefunds > 0,
    };
  }

  /**
   * 사용자 탈퇴 시 빌링키 삭제
   */
  async deleteUserBillingKeys(userId: number): Promise<number> {
    const result = await this.prisma.billingKey.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });
    return result.count;
  }
}
