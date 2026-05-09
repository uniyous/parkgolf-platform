import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { DeliveryService } from './delivery.service';
import { NotificationService } from './notification.service';
import { DeadLetterService } from './dead-letter.service';
import { PgBossService } from '../../common/pgboss/pgboss.service';

const QUEUE = {
  PROCESS_SCHEDULED: 'notify-scheduled-process',
  RETRY_FAILED: 'notify-retry-failed',
  MOVE_DLQ: 'notify-move-dlq',
  CLEANUP_EXPIRED: 'notify-cleanup-expired',
} as const;

/**
 * 알림 정기 작업 워커
 *
 * pg-boss recurring schedule 기반:
 *   - 매분: 예약 알림 발송 / 실패 알림 재시도
 *   - 5분: 영구 실패 → DLQ 이동
 *   - 새벽 2시: 만료 알림 정리 (타입별 TTL)
 *
 * 멀티 pod 안전: pg-boss SELECT FOR UPDATE SKIP LOCKED — 한 pod만 처리
 */
@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly pgboss: PgBossService,
    private readonly deliveryService: DeliveryService,
    private readonly notificationService: NotificationService,
    private readonly deadLetterService: DeadLetterService,
  ) {}

  async onModuleInit() {
    // 매분: 예약 알림 발송
    await this.pgboss.createQueue(QUEUE.PROCESS_SCHEDULED);
    await this.pgboss.schedule(QUEUE.PROCESS_SCHEDULED, '* * * * *');
    await this.pgboss.work(QUEUE.PROCESS_SCHEDULED, () => this.handleProcessScheduled());

    // 매분: 실패 알림 재시도 (지수 백오프)
    await this.pgboss.createQueue(QUEUE.RETRY_FAILED);
    await this.pgboss.schedule(QUEUE.RETRY_FAILED, '* * * * *');
    await this.pgboss.work(QUEUE.RETRY_FAILED, () => this.handleRetryFailed());

    // 5분: 영구 실패 → DLQ 이동
    await this.pgboss.createQueue(QUEUE.MOVE_DLQ);
    await this.pgboss.schedule(QUEUE.MOVE_DLQ, '*/5 * * * *');
    await this.pgboss.work(QUEUE.MOVE_DLQ, () => this.handleMoveDeadLetterQueue());

    // 새벽 2시: 만료 알림 정리
    await this.pgboss.createQueue(QUEUE.CLEANUP_EXPIRED);
    await this.pgboss.schedule(QUEUE.CLEANUP_EXPIRED, '0 2 * * *');
    await this.pgboss.work(QUEUE.CLEANUP_EXPIRED, () => this.handleCleanupExpired());

    this.logger.log('SchedulerService initialized (pg-boss recurring workers)');
  }

  private async handleProcessScheduled(): Promise<void> {
    try {
      await this.deliveryService.processScheduledNotifications();
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications:', error);
    }
  }

  private async handleRetryFailed(): Promise<void> {
    try {
      await this.deliveryService.retryFailedNotificationsWithBackoff();
    } catch (error) {
      this.logger.error('Failed to retry failed notifications:', error);
    }
  }

  private async handleMoveDeadLetterQueue(): Promise<void> {
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
   * 만료 알림 정리: 타입별 TTL에 따라 READ 알림 삭제 + 미읽음 만료 알림 READ 처리
   */
  private async handleCleanupExpired(): Promise<void> {
    const now = new Date();
    const ttlDays: Record<string, number> = {
      CHAT_MESSAGE: 7,
      FRIEND_REQUEST: 30,
      FRIEND_ACCEPTED: 14,
      BOOKING_CONFIRMED: 7,
      BOOKING_CANCELLED: 7,
      REFUND_COMPLETED: 30,
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
}
