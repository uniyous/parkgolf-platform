import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { NotificationService } from './notification.service';
import { DeadLetterService } from './dead-letter.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly deliveryService: DeliveryService,
    private readonly notificationService: NotificationService,
    private readonly deadLetterService: DeadLetterService,
  ) {}

  /**
   * 예약된 알림 처리 (매분 실행)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    this.logger.debug('Processing scheduled notifications...');
    try {
      await this.deliveryService.processScheduledNotifications();
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications:', error);
    }
  }

  /**
   * 실패한 알림 재시도 (지수 백오프 적용, 매분 실행)
   *
   * 백오프 로직:
   * - retryCount 1: 1분 후 재시도
   * - retryCount 2: 4분 후 재시도 (2^2)
   * - retryCount 3 이상: DLQ로 이동
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async retryFailedNotifications() {
    this.logger.debug('Checking for failed notifications to retry...');
    try {
      await this.deliveryService.retryFailedNotificationsWithBackoff();
    } catch (error) {
      this.logger.error('Failed to retry failed notifications:', error);
    }
  }

  /**
   * 영구 실패한 알림을 Dead Letter Queue로 이동 (5분마다 실행)
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async moveToDeadLetterQueue() {
    this.logger.debug('Checking for permanently failed notifications...');
    try {
      const failedNotifications =
        await this.notificationService.findPermanentlyFailedNotifications();

      if (failedNotifications.length === 0) {
        return;
      }

      this.logger.log(`Moving ${failedNotifications.length} notifications to dead letter queue`);

      for (const notification of failedNotifications) {
        try {
          await this.deadLetterService.moveToDeadLetter(
            notification,
            `Max retries (${notification.retryCount}) exceeded`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to move notification ${notification.id} to DLQ: ${error.message}`,
          );
        }
      }
    } catch (error) {
      this.logger.error('Failed to process dead letter queue:', error);
    }
  }

  /**
   * Dead Letter Queue 정리 (매일 자정에 실행)
   * 30일 이상 지난 항목 삭제
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupDeadLetterQueue() {
    this.logger.debug('Cleaning up dead letter queue...');
    try {
      const deletedCount = await this.deadLetterService.cleanup(30);
      if (deletedCount > 0) {
        this.logger.log(`Cleaned up ${deletedCount} old dead letter notifications`);
      }
    } catch (error) {
      this.logger.error('Failed to cleanup dead letter queue:', error);
    }
  }

  /**
   * 만료 알림 정리 (매일 새벽 2시 실행)
   * 타입별 TTL에 따라 READ 알림 삭제 + 미읽음 만료 알림 READ 처리
   */
  @Cron('0 2 * * *')
  async cleanupExpiredNotifications() {
    const now = new Date();
    const ttlDays: Record<string, number> = {
      CHAT_MESSAGE: 7,
      FRIEND_REQUEST: 30,
      FRIEND_ACCEPTED: 14,
      BOOKING_CONFIRMED: 7,
      BOOKING_CANCELLED: 7,
      PAYMENT_SUCCESS: 30,
      PAYMENT_FAILED: 30,
      SYSTEM_ALERT: 30,
    };

    let totalDeleted = 0;
    let totalMarkedRead = 0;

    for (const [type, days] of Object.entries(ttlDays)) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      totalDeleted += await this.notificationService.deleteExpired(type as NotificationType, cutoff);
      totalMarkedRead += await this.notificationService.markExpiredAsRead(type as NotificationType, cutoff);
    }

    if (totalDeleted > 0 || totalMarkedRead > 0) {
      this.logger.log(`Expired cleanup: deleted=${totalDeleted}, marked_read=${totalMarkedRead}`);
    }
  }

  /**
   * Dead Letter Queue 통계 로깅 (매시간 실행)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async logDeadLetterStats() {
    try {
      const stats = await this.deadLetterService.getStats();
      if (stats.total > 0) {
        this.logger.log(
          `Dead Letter Queue stats: total=${stats.total}, lastDay=${stats.lastDay}, lastWeek=${stats.lastWeek}`,
        );
      }
    } catch (error) {
      this.logger.error('Failed to get DLQ stats:', error);
    }
  }
}
