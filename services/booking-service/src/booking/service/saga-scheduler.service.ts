import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SagaHandlerService } from './saga-handler.service';
import { OutboxProcessorService } from './outbox-processor.service';

/**
 * Saga 스케줄러 서비스
 *
 * 주기적으로 실행되는 Saga 관련 작업:
 * - 타임아웃된 PENDING 예약 정리
 * - 오래된 SENT 이벤트 정리
 */
@Injectable()
export class SagaSchedulerService {
  private readonly logger = new Logger(SagaSchedulerService.name);

  constructor(
    private readonly sagaHandler: SagaHandlerService,
    private readonly outboxProcessor: OutboxProcessorService,
  ) {}

  /**
   * 매 분마다 타임아웃된 PENDING 예약 정리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupTimedOutBookings() {
    this.logger.debug('Running timed-out bookings cleanup...');

    try {
      const cleanedCount = await this.sagaHandler.cleanupTimedOutBookings();
      if (cleanedCount > 0) {
        this.logger.log(`Cleaned up ${cleanedCount} timed-out bookings`);
      }
    } catch (error) {
      this.logger.error(`Failed to cleanup timed-out bookings: ${error.message}`);
    }
  }

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
