import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxProcessorService } from './outbox-processor.service';

/**
 * Booking 스케줄러 서비스
 *
 * - Outbox 이벤트 정리 (7일 이상 된 SENT 이벤트)
 *
 * [DEPRECATED → saga-service 스케줄러로 이관]
 * - 타임아웃된 PENDING 예약 정리
 * - 결제 타임아웃 SLOT_RESERVED 예약 정리
 */
@Injectable()
export class SagaSchedulerService {
  private readonly logger = new Logger(SagaSchedulerService.name);

  constructor(
    private readonly outboxProcessor: OutboxProcessorService,
  ) {}

  /**
   * 매일 자정에 오래된 SENT 이벤트 정리 (7일 이상 된 것)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldOutboxEvents() {
    this.logger.debug('Running old outbox events cleanup...');

    try {
      const cleanedCount = await this.outboxProcessor.cleanupOldEvents(7);
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} old outbox events`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup old outbox events: ${error.message}`);
    }
  }
}
