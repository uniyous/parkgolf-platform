import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SplitStatus } from '@prisma/client';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException, Errors } from '../../common/exceptions';
import { TossApiService } from './toss-api.service';
import { PaymentService } from './payment.service';
import { v4 as uuidv4 } from 'uuid';

export interface SplitPrepareDto {
  bookingGroupId?: number;
  bookingId: number;
  participants: Array<{
    userId: number;
    userName: string;
    userEmail: string;
    amount: number;
  }>;
  expirationMinutes?: number; // 기본 3분 (saga-engine의 PAYMENT_TIMEOUT_DELAY_SECONDS와 동기화)
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
    private readonly prisma: PrismaService,
    private readonly tossApi: TossApiService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    private readonly paymentService: PaymentService,
  ) {}

  /**
   * 분할결제 준비
   * 참여자별 개별 orderId를 생성하여 PaymentSplit 레코드 생성
   */
  async prepareSplit(dto: SplitPrepareDto) {
    const expirationMinutes = dto.expirationMinutes || 3;
    const expiredAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    const splits = await this.prisma.$transaction(
      dto.participants.map((p) =>
        this.prisma.paymentSplit.create({
          data: {
            bookingGroupId: dto.bookingGroupId,
            bookingId: dto.bookingId,
            userId: p.userId,
            userName: p.userName,
            userEmail: p.userEmail,
            amount: p.amount,
            status: SplitStatus.PENDING,
            orderId: `SPL-${Date.now()}-${uuidv4().slice(0, 8)}`,
            expiredAt,
          },
        }),
      ),
    );

    this.logger.log(
      `Split prepared: ${splits.length} splits for booking ${dto.bookingId}`,
    );

    return {
      bookingId: dto.bookingId,
      bookingGroupId: dto.bookingGroupId,
      splits: splits.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName,
        amount: s.amount,
        orderId: s.orderId,
        status: s.status,
        expiredAt: s.expiredAt,
      })),
    };
  }

  /**
   * 개별 분할결제 승인
   * Toss 결제 위젯에서 리다이렉트 후 호출
   */
  async confirmSplit(dto: SplitConfirmDto) {
    const split = await this.prisma.paymentSplit.findUnique({
      where: { orderId: dto.orderId },
    });

    if (!split) {
      throw new AppException(Errors.Split.NOT_FOUND);
    }

    if (split.status === SplitStatus.PAID) {
      throw new AppException(Errors.Split.ALREADY_PAID);
    }

    if (split.status !== SplitStatus.PENDING) {
      throw new AppException(Errors.Split.INVALID_STATUS);
    }

    if (split.expiredAt && new Date() > split.expiredAt) {
      throw new AppException(Errors.Split.EXPIRED);
    }

    if (split.amount !== dto.amount) {
      throw new AppException(
        Errors.Payment.AMOUNT_MISMATCH,
        `예상 금액: ${split.amount}원, 요청 금액: ${dto.amount}원`,
      );
    }

    // Toss 결제 승인 API 호출 — 실제 결제가 완료되었는지 검증
    const tossResult = await this.tossApi.confirmPayment(
      dto.paymentKey,
      dto.orderId,
      dto.amount,
    );

    if (tossResult.status !== 'DONE') {
      this.logger.warn(
        `Split payment not confirmed by Toss: orderId=${dto.orderId}, status=${tossResult.status}`,
      );
      throw new AppException(
        Errors.Payment.INVALID_STATUS,
        `토스 결제 상태가 유효하지 않습니다: ${tossResult.status}`,
      );
    }

    // 결제 완료 처리 — paymentKey 보관 (환불 시 사용)
    const updated = await this.prisma.paymentSplit.update({
      where: { id: split.id },
      data: {
        status: SplitStatus.PAID,
        paidAt: new Date(),
        paymentKey: dto.paymentKey,
      },
    });

    // booking-service에 참여자 결제 완료 알림 (request-reply — allPaid 응답 수신)
    const markRes = await firstValueFrom(
      this.bookingClient
        .send('booking.participant.paid', {
          bookingId: split.bookingId,
          userId: split.userId,
          userName: split.userName,
          userEmail: split.userEmail,
          amount: split.amount,
        })
        .pipe(
          timeout(5000),
          catchError((err) => {
            this.logger.error(
              `markParticipantPaid failed: ${err?.message || err}`,
            );
            return of({ success: false, data: { settled: false } } as any);
          }),
        ),
    );

    this.logger.log(
      `Split confirmed: orderId=${dto.orderId}, user=${split.userId}, settled=${markRes?.data?.settled}`,
    );

    // 모든 참여자 결제 완료 → 단건 결제와 동일하게 payment.confirmed outbox 발행
    // → saga의 PAYMENT_CONFIRMED 트리거 (SEND_CONFIRMATION / REGISTER_COMPANY_MEMBER)
    if (markRes?.success && markRes?.data?.settled === true) {
      await this.paymentService.createOutboxEvent('payment.confirmed', {
        // 더치페이는 단일 paymentId/paymentKey/orderId 의미 없음
        // (split N개 각각 별도 토스 결제 보유)
        paymentId: null,
        paymentKey: null,
        orderId: null,
        amount: markRes.data?.amount ?? split.amount,
        bookingId: split.bookingId,
        userId: markRes.data?.userId ?? split.userId,
        splitPayment: true,
      });
      this.logger.log(
        `[Outbox] payment.confirmed emitted for split-payment booking=${split.bookingId}`,
      );
    }

    return {
      id: updated.id,
      orderId: updated.orderId,
      userId: updated.userId,
      amount: updated.amount,
      status: updated.status,
      paidAt: updated.paidAt,
    };
  }

  /**
   * 분할결제 상태 조회
   */
  async getSplitsByBookingGroup(bookingGroupId: number) {
    const splits = await this.prisma.paymentSplit.findMany({
      where: { bookingGroupId },
      orderBy: { createdAt: 'asc' },
    });

    const paidCount = splits.filter((s) => s.status === SplitStatus.PAID).length;

    return {
      bookingGroupId,
      total: splits.length,
      paidCount,
      pendingCount: splits.length - paidCount,
      allPaid: paidCount === splits.length,
      splits: splits.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName,
        amount: s.amount,
        orderId: s.orderId,
        status: s.status,
        paidAt: s.paidAt,
        expiredAt: s.expiredAt,
      })),
    };
  }

  /**
   * 분할결제 상태 조회 (bookingId)
   */
  async getSplitsByBooking(bookingId: number) {
    const splits = await this.prisma.paymentSplit.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'asc' },
    });

    const paidCount = splits.filter((s) => s.status === SplitStatus.PAID).length;

    return {
      bookingId,
      total: splits.length,
      paidCount,
      pendingCount: splits.length - paidCount,
      allPaid: paidCount === splits.length,
      splits: splits.map((s) => ({
        id: s.id,
        userId: s.userId,
        userName: s.userName,
        amount: s.amount,
        orderId: s.orderId,
        status: s.status,
        paidAt: s.paidAt,
        expiredAt: s.expiredAt,
      })),
    };
  }

  /**
   * 분할결제 상태 조회 (orderId → bookingId 기반)
   * orderId로 split 레코드를 찾고, 같은 bookingId의 모든 splits 반환
   */
  async getSplitsByOrderId(orderId: string) {
    const split = await this.prisma.paymentSplit.findUnique({
      where: { orderId },
    });

    if (!split) {
      throw new AppException(Errors.Split.NOT_FOUND);
    }

    return this.getSplitsByBooking(split.bookingId);
  }

  /**
   * 만료된 분할결제 처리
   */
  async expirePendingSplits() {
    const expired = await this.prisma.paymentSplit.updateMany({
      where: {
        status: SplitStatus.PENDING,
        expiredAt: { lt: new Date() },
      },
      data: { status: SplitStatus.EXPIRED },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} pending splits`);
    }

    return { expiredCount: expired.count };
  }

  /**
   * 분할결제 일괄 환불 (PAYMENT_TIMEOUT Saga의 REFUND_PAID_SPLITS step에서 호출)
   * - bookingId의 PAID split을 모두 Toss 환불 → status=REFUNDED
   * - PENDING split은 EXPIRED로 변경
   * - 부분 실패 시 saga가 재시도 또는 REQUIRES_MANUAL로 운영자 개입
   */
  async refundPaidSplitsByBooking(data: {
    bookingId: number;
    reason?: string;
  }) {
    const splits = await this.prisma.paymentSplit.findMany({
      where: { bookingId: data.bookingId },
      include: { payment: true },
    });

    if (splits.length === 0) {
      this.logger.warn(`No splits found for booking ${data.bookingId}`);
      return { refundedCount: 0, expiredCount: 0, refundedAmount: 0, failedCount: 0 };
    }

    const reason = data.reason || '결제 타임아웃 - 분할결제 미완료로 자동 환불';
    let refundedCount = 0;
    let refundedAmount = 0;
    let failedCount = 0;
    const failures: Array<{ orderId: string; error: string }> = [];

    // PAID 상태인 split을 Toss 환불
    for (const split of splits) {
      if (split.status !== SplitStatus.PAID) continue;

      // paymentKey 우선 순서: PaymentSplit.paymentKey → Payment.paymentKey (legacy fallback)
      const paymentKey = split.paymentKey ?? split.payment?.paymentKey;
      if (!paymentKey) {
        this.logger.error(
          `Split ${split.id} (orderId=${split.orderId}) has no paymentKey - cannot refund via Toss`,
        );
        failedCount++;
        failures.push({ orderId: split.orderId, error: 'no_paymentKey' });
        continue;
      }

      try {
        await this.tossApi.cancelPayment(paymentKey, reason, split.amount);
        await this.prisma.paymentSplit.update({
          where: { id: split.id },
          data: { status: SplitStatus.REFUNDED },
        });
        refundedCount++;
        refundedAmount += split.amount;
        this.logger.log(
          `Split refunded: orderId=${split.orderId}, user=${split.userId}, amount=${split.amount}`,
        );
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'unknown';
        this.logger.error(`Split refund failed: orderId=${split.orderId}, err=${errMsg}`);
        failedCount++;
        failures.push({ orderId: split.orderId, error: errMsg });
      }
    }

    // PENDING split을 EXPIRED로 일괄 변경
    const expiredResult = await this.prisma.paymentSplit.updateMany({
      where: {
        bookingId: data.bookingId,
        status: SplitStatus.PENDING,
      },
      data: { status: SplitStatus.EXPIRED },
    });

    this.logger.log(
      `refundPaidSplitsByBooking(${data.bookingId}): refunded=${refundedCount}, ` +
      `amount=${refundedAmount}, expired=${expiredResult.count}, failed=${failedCount}`,
    );

    // 환불 실패 1건이라도 있으면 saga step 실패 → REQUIRES_MANUAL 처리 유도
    if (failedCount > 0) {
      throw new AppException(
        Errors.Refund.REFUND_FAILED,
        `분할결제 환불 일부 실패: ${failedCount}건. failures=${JSON.stringify(failures)}`,
      );
    }

    return {
      bookingId: data.bookingId,
      refundedCount,
      refundedAmount,
      expiredCount: expiredResult.count,
      failedCount,
    };
  }

  /**
   * 단일 PaymentSplit 환불 — AGENT_PAY.md §11.4 (개인 자리 취소)
   *
   * booking-service `booking.cancelParticipant`가 호출한다.
   * - PaymentSplit(bookingId + userId) 1건을 조회
   * - booking-service `policy.refund.resolve`로 환불률 계산 (출발까지 남은 시간 → tier)
   * - Toss 부분 환불 후 status=REFUNDED
   *
   * 환불률 0%면 Toss 미호출, status만 REFUNDED 마킹.
   * 정책 조회 실패 시 안전 fallback 100% 환불 (운영 정책 미등록 대비).
   */
  async refundSingleSplit(data: {
    bookingId: number;
    userId: number;
    reason?: string;
    clubId?: number | null;
    companyId?: number | null;
    bookingDate?: string | Date;
    startTime?: string;
  }): Promise<{
    orderId: string;
    refundedAmount: number;
    refundRate: number;
    splitAmount: number;
    paymentKey: string;
  }> {
    const split = await this.prisma.paymentSplit.findFirst({
      where: { bookingId: data.bookingId, userId: data.userId },
      include: { payment: true },
    });

    if (!split) {
      throw new AppException(
        Errors.Refund.NOT_FOUND,
        `PaymentSplit not found: booking=${data.bookingId} user=${data.userId}`,
      );
    }

    if (split.status !== SplitStatus.PAID) {
      throw new AppException(
        Errors.Refund.REFUND_FAILED,
        `Cannot refund split with status=${split.status} (orderId=${split.orderId})`,
      );
    }

    const paymentKey = split.paymentKey ?? split.payment?.paymentKey;
    if (!paymentKey) {
      throw new AppException(
        Errors.Refund.REFUND_FAILED,
        `Split ${split.orderId} has no paymentKey`,
      );
    }

    // 환불률 결정 (booking-service의 policy.refund.resolve 호출)
    const refundRate = await this.resolveRefundRate({
      clubId: data.clubId ?? undefined,
      companyId: data.companyId ?? undefined,
      bookingDate: data.bookingDate,
      startTime: data.startTime,
    });

    const refundedAmount = Math.floor((split.amount * refundRate) / 100);
    const reason = data.reason || '본인 자리 취소 (마이페이지)';

    if (refundedAmount > 0) {
      await this.tossApi.cancelPayment(paymentKey, reason, refundedAmount);
    } else {
      this.logger.warn(
        `Refund rate=0%, skipping Toss call: orderId=${split.orderId}, user=${split.userId}`,
      );
    }

    await this.prisma.paymentSplit.update({
      where: { id: split.id },
      data: { status: SplitStatus.REFUNDED },
    });

    this.logger.log(
      `Split refunded (single): orderId=${split.orderId} user=${split.userId} ` +
        `amount=${split.amount} rate=${refundRate}% refunded=${refundedAmount}`,
    );

    return {
      orderId: split.orderId,
      refundedAmount,
      refundRate,
      splitAmount: split.amount,
      paymentKey,
    };
  }

  /**
   * 환불률(%) 결정 — booking-service의 policy.refund.resolve 호출.
   *
   * 1) policy 없으면 100% (안전 fallback)
   * 2) bookingDate/startTime 없으면 100% (계산 불가)
   * 3) tiers 중 minHoursBefore ≤ hours < maxHoursBefore matching → refundRate
   * 4) 매칭 tier 없으면 0% (보수적)
   */
  private async resolveRefundRate(args: {
    clubId?: number;
    companyId?: number;
    bookingDate?: string | Date;
    startTime?: string;
  }): Promise<number> {
    let policy: any = null;
    try {
      const res: any = await firstValueFrom(
        this.bookingClient
          .send('policy.refund.resolve', {
            clubId: args.clubId,
            companyId: args.companyId,
          })
          .pipe(
            timeout(5000),
            catchError((err) => {
              this.logger.warn(`policy.refund.resolve failed: ${err?.message || err}`);
              return of(null);
            }),
          ),
      );
      // NatsResponse 포맷({ success, data }) 또는 raw policy 모두 처리
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

    // tiers: minHoursBefore ≤ hours < (maxHoursBefore ?? ∞) 매칭
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
    const datePart =
      bookingDate instanceof Date
        ? bookingDate.toISOString().slice(0, 10)
        : String(bookingDate).slice(0, 10);
    // startTime: 'HH:MM' or 'HH:MM:SS'
    const timePart = /^\d{2}:\d{2}(:\d{2})?$/.test(startTime) ? startTime : '00:00';
    return new Date(`${datePart}T${timePart.length === 5 ? timePart + ':00' : timePart}`);
  }
}
