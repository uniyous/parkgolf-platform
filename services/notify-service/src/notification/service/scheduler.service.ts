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

  @Cron('0 9 * * *') // Daily at 9 AM
  async sendBookingReminders() {
    this.logger.log('Sending daily booking reminders...');
    // TODO: Implement booking reminder logic
    // This would query the booking service for bookings tomorrow
    // and send reminder notifications
  }

  @Cron('0 18 * * *') // Daily at 6 PM
  async sendPromotionalNotifications() {
    this.logger.log('Processing promotional notifications...');
    // TODO: Implement promotional notification logic
    // This would send marketing emails to users who opted in
  }
}