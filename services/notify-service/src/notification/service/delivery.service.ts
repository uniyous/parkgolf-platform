import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationService } from './notification.service';
import { PreferencesService } from './preferences.service';

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
  ) {}

  async deliverNotification(notification: Notification): Promise<boolean> {
    const channelName = notification.deliveryChannel || 'EMAIL';

    // Check user preferences
    const hasPermission = await this.preferencesService.checkUserPreference(
      notification.userId,
      channelName.toLowerCase() as any,
    );

    if (!hasPermission) {
      this.logger.log(`User ${notification.userId} has disabled ${channelName} notifications`);
      await this.notificationService.markAsSent(notification.id);
      return true;
    }

    try {
      const success = await this.sendEmail(notification);

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
}
