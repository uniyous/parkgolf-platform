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
  expirationMinutes?: number; // 기본 5분 (saga-service의 SLOT_RESERVED_TIMEOUT_MINUTES와 통일)
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
    const expirationMinutes = dto.expirationMinutes || 5;
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

    // 결제 완료 처리
    const updated = await this.prisma.paymentSplit.update({
      where: { id: split.id },
      data: {
        status: SplitStatus.PAID,
        paidAt: new Date(),
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

      const paymentKey = split.payment?.paymentKey;
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
}
