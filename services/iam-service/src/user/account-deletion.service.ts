import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../prisma/prisma.service';
import { AppException } from '../common/exceptions/app.exception';
import { Errors } from '../common/exceptions/catalog/error-catalog';
import * as bcrypt from 'bcrypt';
import { firstValueFrom, timeout } from 'rxjs';

const GRACE_PERIOD_DAYS = 7;
const NATS_TIMEOUT_MS = 10000;

@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentClient: ClientProxy,
  ) {}

  /**
   * 계정 삭제 요청
   * - 비밀번호 확인
   * - 제한 조건 체크 (예약/결제)
   * - 유예 기간 등록
   * - 알림 이벤트 발행
   */
  async requestDeletion(userId: number, password: string, reason?: string) {
    // 사용자 조회
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(Errors.User.NOT_FOUND);
    }

    // 이미 삭제 요청 중인지 확인
    if (user.deletionRequestedAt) {
      throw new AppException(Errors.User.DELETION_ALREADY_REQUESTED);
    }

    // 비밀번호 확인
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new AppException(Errors.User.INVALID_PASSWORD);
    }

    // 예약 제한 조건 확인
    await this.checkBookingConstraints(userId);

    // 결제 제한 조건 확인
    await this.checkPaymentConstraints(userId);

    // 유예 기간 등록
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: now,
        deletionScheduledAt: scheduledAt,
        isActive: false,
      },
    });

    // 리프레시 토큰 삭제
    await this.prisma.refreshToken.deleteMany({ where: { userId } });

    // 삭제 요청 알림 이벤트 발행
    this.notificationClient.emit('user.deletion.requested', {
      userId,
      email: user.email,
      name: user.name,
      reason,
      requestedAt: now.toISOString(),
      scheduledAt: scheduledAt.toISOString(),
    });

    this.logger.log(`Account deletion requested: userId=${userId}, scheduledAt=${scheduledAt.toISOString()}`);

    return {
      userId: updatedUser.id,
      deletionRequestedAt: updatedUser.deletionRequestedAt,
      deletionScheduledAt: updatedUser.deletionScheduledAt,
      gracePeriodDays: GRACE_PERIOD_DAYS,
    };
  }

  /**
   * 계정 삭제 취소
   */
  async cancelDeletion(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppException(Errors.User.NOT_FOUND);
    }

    if (!user.deletionRequestedAt) {
      throw new AppException(Errors.User.DELETION_NOT_REQUESTED);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        deletionScheduledAt: null,
        isActive: true,
      },
    });

    // 삭제 취소 알림 이벤트 발행
    this.notificationClient.emit('user.deletion.cancelled', {
      userId,
      email: user.email,
      name: user.name,
      cancelledAt: new Date().toISOString(),
    });

    this.logger.log(`Account deletion cancelled: userId=${userId}`);

    return { userId, cancelled: true };
  }

  /**
   * 삭제 상태 조회
   */
  async getDeletionStatus(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        deletionRequestedAt: true,
        deletionScheduledAt: true,
        isActive: true,
      },
    });

    if (!user) {
      throw new AppException(Errors.User.NOT_FOUND);
    }

    if (!user.deletionRequestedAt || !user.deletionScheduledAt) {
      return {
        userId: user.id,
        isDeletionRequested: false,
        deletionRequestedAt: null,
        deletionScheduledAt: null,
        daysRemaining: null,
      };
    }

    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((user.deletionScheduledAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)),
    );

    return {
      userId: user.id,
      isDeletionRequested: true,
      deletionRequestedAt: user.deletionRequestedAt,
      deletionScheduledAt: user.deletionScheduledAt,
      daysRemaining,
    };
  }

  /**
   * 로그인 시 유예 기간 자동 취소
   */
  async handleLoginDuringGracePeriod(userId: number) {
    this.logger.log(`Auto-cancelling deletion during grace period: userId=${userId}`);
    return this.cancelDeletion(userId);
  }

  /**
   * CronJob: D-3, D-1 리마인더 처리
   */
  async processReminders() {
    const now = new Date();

    // D-3 사용자 (3일 남은 사용자)
    const d3Start = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const d3End = new Date(d3Start.getTime() + 24 * 60 * 60 * 1000);
    const d3Users = await this.prisma.user.findMany({
      where: {
        deletionScheduledAt: { gte: d3Start, lt: d3End },
        deletionRequestedAt: { not: null },
      },
      select: { id: true, email: true, name: true, deletionScheduledAt: true },
    });

    for (const user of d3Users) {
      this.notificationClient.emit('user.deletion.reminder', {
        userId: user.id,
        email: user.email,
        name: user.name,
        daysRemaining: 3,
        scheduledAt: user.deletionScheduledAt?.toISOString(),
      });
    }

    // D-1 사용자 (1일 남은 사용자)
    const d1Start = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);
    const d1End = new Date(d1Start.getTime() + 24 * 60 * 60 * 1000);
    const d1Users = await this.prisma.user.findMany({
      where: {
        deletionScheduledAt: { gte: d1Start, lt: d1End },
        deletionRequestedAt: { not: null },
      },
      select: { id: true, email: true, name: true, deletionScheduledAt: true },
    });

    for (const user of d1Users) {
      this.notificationClient.emit('user.deletion.reminder', {
        userId: user.id,
        email: user.email,
        name: user.name,
        daysRemaining: 1,
        scheduledAt: user.deletionScheduledAt?.toISOString(),
      });
    }

    this.logger.log(`Reminders processed: D-3=${d3Users.length}, D-1=${d1Users.length}`);

    return {
      d3Count: d3Users.length,
      d1Count: d1Users.length,
      processedAt: now.toISOString(),
    };
  }

  /**
   * CronJob: 유예 기간 만료 사용자 삭제 실행
   */
  async executeDeletions() {
    const now = new Date();

    // 유예 기간 만료된 사용자 조회
    const expiredUsers = await this.prisma.user.findMany({
      where: {
        deletionScheduledAt: { lte: now },
        deletionRequestedAt: { not: null },
      },
    });

    let deletedCount = 0;

    for (const user of expiredUsers) {
      try {
        await this.prisma.$transaction(async (tx) => {
          // UserHistory 생성
          await tx.userHistory.create({
            data: {
              originalUserId: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              deletionReason: null,
              deletedAt: now,
            },
          });

          // User 삭제 (Cascade로 연관 데이터 정리)
          await tx.user.delete({ where: { id: user.id } });
        });

        // user.deleted 이벤트 발행 (다른 서비스에서 데이터 익명화/삭제)
        this.notificationClient.emit('user.deleted', {
          userId: user.id,
          email: user.email,
          deletedAt: now.toISOString(),
        });

        deletedCount++;
        this.logger.log(`User deleted: userId=${user.id}, email=${user.email}`);
      } catch (error) {
        this.logger.error(`Failed to delete user: userId=${user.id}`, error instanceof Error ? error.message : error);
      }
    }

    this.logger.log(`Deletion execution completed: ${deletedCount}/${expiredUsers.length} users deleted`);

    return {
      totalExpired: expiredUsers.length,
      deletedCount,
      executedAt: now.toISOString(),
    };
  }

  /**
   * 예약 제한 조건 확인
   */
  private async checkBookingConstraints(userId: number) {
    try {
      const result = await firstValueFrom(
        this.bookingClient.send('booking.userActiveCheck', { userId }).pipe(timeout(NATS_TIMEOUT_MS)),
      );

      if (result?.hasActiveBooking) {
        throw new AppException(Errors.User.DELETION_ACTIVE_BOOKING);
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.logger.warn(`Booking constraint check failed: ${error instanceof Error ? error.message : error}`);
    }
  }

  /**
   * 결제 제한 조건 확인
   */
  private async checkPaymentConstraints(userId: number) {
    try {
      const result = await firstValueFrom(
        this.paymentClient.send('payment.userActiveCheck', { userId }).pipe(timeout(NATS_TIMEOUT_MS)),
      );

      if (result?.hasPendingPayment) {
        throw new AppException(Errors.User.DELETION_PENDING_PAYMENT);
      }

      if (result?.hasPendingRefund) {
        throw new AppException(Errors.User.DELETION_PENDING_REFUND);
      }
    } catch (error) {
      if (error instanceof AppException) throw error;
      this.logger.warn(`Payment constraint check failed: ${error instanceof Error ? error.message : error}`);
    }
  }
}
