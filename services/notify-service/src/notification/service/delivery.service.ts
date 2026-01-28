import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationService } from './notification.service';
import { PreferencesService } from './preferences.service';
import { PushService } from './push.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
    private readonly pushService: PushService,
  ) {}

  async deliverNotification(notification: Notification): Promise<boolean> {
    const channelName = notification.deliveryChannel || 'PUSH';

    // Check user preferences
    const hasPermission = await this.preferencesService.checkUserPreference(
      notification.userId,
      channelName.toLowerCase() as 'email' | 'sms' | 'push',
    );

    if (!hasPermission) {
      this.logger.log(`User ${notification.userId} has disabled ${channelName} notifications`);
      await this.notificationService.markAsSent(notification.id);
      return true;
    }

    try {
      let success = false;

      switch (channelName.toUpperCase()) {
        case 'PUSH':
          success = await this.sendPush(notification);
          break;
        case 'EMAIL':
          success = await this.sendEmail(notification);
          break;
        case 'SMS':
          success = await this.sendSms(notification);
          break;
        default:
          // Default to push notification
          success = await this.sendPush(notification);
          break;
      }

      if (success) {
        await this.notificationService.markAsSent(notification.id);
        return true;
      } else {
        await this.notificationService.markAsFailed(notification.id);
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to deliver notification ${notification.id}:`, error);
      await this.notificationService.markAsFailed(notification.id);
      return false;
    }
  }

  private async sendPush(notification: Notification): Promise<boolean> {
    try {
      this.logger.log(`Sending push notification ${notification.id} to user ${notification.userId}`);

      const result = await this.pushService.sendPushNotification(notification.userId, {
        title: notification.title,
        body: notification.message,
        data: notification.data ? this.convertDataToStringRecord(notification.data) : undefined,
      });

      // Consider success if at least one device received the notification
      // or if there were no devices registered (user might check in-app)
      const success = result.successCount > 0 || (result.successCount === 0 && result.failureCount === 0);

      if (success) {
        this.logger.log(`Push notification ${notification.id} sent successfully (${result.successCount} devices)`);
      } else {
        this.logger.warn(`Push notification ${notification.id} failed for all ${result.failureCount} devices`);
      }

      return success;
    } catch (error) {
      this.logger.error(`Failed to send push notification ${notification.id}:`, error);
      return false;
    }
  }

  private async sendEmail(notification: Notification): Promise<boolean> {
    try {
      this.logger.log(`Sending email notification ${notification.id} to user ${notification.userId}`);

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // const emailResult = await this.emailService.send({
      //   to: userInfo.email,
      //   subject: notification.title,
      //   html: notification.message,
      //   templateData: notification.data
      // });

      // Simulate email sending (remove when actual integration is done)
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`Email notification ${notification.id} sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email notification ${notification.id}:`, error);
      return false;
    }
  }

  private async sendSms(notification: Notification): Promise<boolean> {
    try {
      this.logger.log(`Sending SMS notification ${notification.id} to user ${notification.userId}`);

      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // const smsResult = await this.smsService.send({
      //   to: userInfo.phone,
      //   message: notification.message
      // });

      // Simulate SMS sending (remove when actual integration is done)
      await new Promise((resolve) => setTimeout(resolve, 100));

      this.logger.log(`SMS notification ${notification.id} sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS notification ${notification.id}:`, error);
      return false;
    }
  }

  /**
   * Convert JSON data to Record<string, string> for FCM
   */
  private convertDataToStringRecord(data: unknown): Record<string, string> {
    const result: Record<string, string> = {};

    if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined) {
          result[key] = typeof value === 'string' ? value : JSON.stringify(value);
        }
      }
    }

    return result;
  }

  async processScheduledNotifications(): Promise<void> {
    const scheduledNotifications = await this.notificationService.findScheduledNotifications();

    this.logger.log(`Processing ${scheduledNotifications.length} scheduled notifications`);

    for (const notification of scheduledNotifications) {
      await this.deliverNotification(notification);
    }
  }

  async retryFailedNotifications(): Promise<void> {
    const failedNotifications = await this.notificationService.findFailedNotificationsForRetry();

    this.logger.log(`Retrying ${failedNotifications.length} failed notifications`);

    for (const notification of failedNotifications) {
      await this.deliverNotification(notification);
    }
  }

  /**
   * 지수 백오프를 적용한 재시도
   */
  async retryFailedNotificationsWithBackoff(): Promise<void> {
    const failedNotifications =
      await this.notificationService.findFailedNotificationsForRetryWithBackoff();

    if (failedNotifications.length > 0) {
      this.logger.log(`Retrying ${failedNotifications.length} failed notifications with backoff`);

      for (const notification of failedNotifications) {
        await this.deliverNotification(notification);
      }
    }
  }
}
