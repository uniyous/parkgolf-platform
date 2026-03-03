import { Injectable, Logger, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { SplitStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException, Errors } from '../../common/exceptions';
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
  expirationMinutes?: number; // 기본 30분
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
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  /**
   * 분할결제 준비
   * 참여자별 개별 orderId를 생성하여 PaymentSplit 레코드 생성
   */
  async prepareSplit(dto: SplitPrepareDto) {
    const expirationMinutes = dto.expirationMinutes || 30;
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

    // 결제 완료 처리
    const updated = await this.prisma.paymentSplit.update({
      where: { id: split.id },
      data: {
        status: SplitStatus.PAID,
        paidAt: new Date(),
      },
    });

    // booking-service에 참여자 결제 완료 알림
    this.bookingClient.emit('booking.participant.paid', {
      bookingId: split.bookingId,
      userId: split.userId,
      userName: split.userName,
      userEmail: split.userEmail,
      amount: split.amount,
    });

    this.logger.log(
      `Split confirmed: orderId=${dto.orderId}, user=${split.userId}`,
    );

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
}
