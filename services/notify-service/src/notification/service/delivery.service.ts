import { Injectable, Logger } from '@nestjs/common';
import { Notification } from '@prisma/client';
import { NotificationService } from './notification.service';
import { PreferencesService } from './preferences.service';

export interface DeliveryChannel {
  send(notification: Notification, userInfo?: any): Promise<boolean>;
  getChannelName(): string;
}

@Injectable()
export class EmailDeliveryChannel implements DeliveryChannel {
  private readonly logger = new Logger(EmailDeliveryChannel.name);

  getChannelName(): string {
    return 'EMAIL';
  }

  async send(notification: Notification, userInfo?: any): Promise<boolean> {
    try {
      this.logger.log(`Sending email notification ${notification.id} to user ${notification.userId}`);
      
      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // const emailResult = await this.emailService.send({
      //   to: userInfo.email,
      //   subject: notification.title,
      //   html: notification.message,
      //   templateData: notification.data
      // });

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`Email notification ${notification.id} sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email notification ${notification.id}:`, error);
      return false;
    }
  }
}

@Injectable()
export class SmsDeliveryChannel implements DeliveryChannel {
  private readonly logger = new Logger(SmsDeliveryChannel.name);

  getChannelName(): string {
    return 'SMS';
  }

  async send(notification: Notification, userInfo?: any): Promise<boolean> {
    try {
      this.logger.log(`Sending SMS notification ${notification.id} to user ${notification.userId}`);
      
      // TODO: Integrate with actual SMS service (Twilio, AWS SNS, etc.)
      // const smsResult = await this.smsService.send({
      //   to: userInfo.phoneNumber,
      //   message: `${notification.title}: ${notification.message}`
      // });

      // Simulate SMS sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`SMS notification ${notification.id} sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS notification ${notification.id}:`, error);
      return false;
    }
  }
}

@Injectable()
export class PushDeliveryChannel implements DeliveryChannel {
  private readonly logger = new Logger(PushDeliveryChannel.name);

  getChannelName(): string {
    return 'PUSH';
  }

  async send(notification: Notification, userInfo?: any): Promise<boolean> {
    try {
      this.logger.log(`Sending push notification ${notification.id} to user ${notification.userId}`);
      
      // TODO: Integrate with actual push service (Firebase FCM, Apple Push, etc.)
      // const pushResult = await this.pushService.send({
      //   to: userInfo.deviceTokens,
      //   title: notification.title,
      //   body: notification.message,
      //   data: notification.data
      // });

      // Simulate push sending
      await new Promise(resolve => setTimeout(resolve, 100));
      
      this.logger.log(`Push notification ${notification.id} sent successfully`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send push notification ${notification.id}:`, error);
      return false;
    }
  }
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);
  private readonly channels = new Map<string, DeliveryChannel>();

  constructor(
    private readonly notificationService: NotificationService,
    private readonly preferencesService: PreferencesService,
    private readonly emailChannel: EmailDeliveryChannel,
    private readonly smsChannel: SmsDeliveryChannel,
    private readonly pushChannel: PushDeliveryChannel,
  ) {
    this.registerChannel(emailChannel);
    this.registerChannel(smsChannel);
    this.registerChannel(pushChannel);
  }

  private registerChannel(channel: DeliveryChannel): void {
    this.channels.set(channel.getChannelName(), channel);
  }

  async deliverNotification(notification: Notification): Promise<boolean> {
    const channelName = notification.deliveryChannel || 'EMAIL';
    const channel = this.channels.get(channelName);

    if (!channel) {
      this.logger.error(`Unknown delivery channel: ${channelName}`);
      await this.notificationService.markAsFailed(notification.id);
      return false;
    }

    // Check user preferences
    const hasPermission = await this.preferencesService.checkUserPreference(
      notification.userId,
      channelName.toLowerCase() as any
    );

    if (!hasPermission) {
      this.logger.log(`User ${notification.userId} has disabled ${channelName} notifications`);
      await this.notificationService.markAsSent(notification.id);
      return true; // Consider as success since user preference was respected
    }

    try {
      // TODO: Get user info from user service
      // const userInfo = await this.getUserInfo(notification.userId);
      const userInfo = { email: 'user@example.com', phoneNumber: '+1234567890' };

      const success = await channel.send(notification, userInfo);

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

  private async getUserInfo(userId: string): Promise<any> {
    // TODO: Implement RPC call to user service
    // return await this.userServiceClient.send('user.get_contact_info', { userId }).toPromise();
    return {
      email: 'user@example.com',
      phoneNumber: '+1234567890',
      deviceTokens: ['token1', 'token2']
    };
  }
}