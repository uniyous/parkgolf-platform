import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DeliveryService } from './delivery.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private readonly deliveryService: DeliveryService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async processScheduledNotifications() {
    this.logger.debug('Processing scheduled notifications...');
    try {
      await this.deliveryService.processScheduledNotifications();
    } catch (error) {
      this.logger.error('Failed to process scheduled notifications:', error);
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async retryFailedNotifications() {
    this.logger.debug('Retrying failed notifications...');
    try {
      await this.deliveryService.retryFailedNotifications();
    } catch (error) {
      this.logger.error('Failed to retry failed notifications:', error);
    }
  }
}
