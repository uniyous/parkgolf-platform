import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { GetNotificationsQueryDto } from './dto/notification.dto';

@Injectable()
export class NotifyService {
  private readonly logger = new Logger(NotifyService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  // ==================== Notification CRUD ====================

  /**
   * 사용자 알림 목록 조회
   */
  async getNotifications(userId: number, query: GetNotificationsQueryDto) {
    this.logger.log(`Getting notifications for user: ${userId}`);
    return this.natsClient.send(
      'notification.get_user_notifications',
      { userId: String(userId), query },
      NATS_TIMEOUTS.LIST_QUERY,
    );
  }

  /**
   * 읽지 않은 알림 수 조회
   */
  async getUnreadCount(userId: number) {
    this.logger.log(`Getting unread count for user: ${userId}`);
    return this.natsClient.send(
      'notification.get_unread_count',
      { userId: String(userId) },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * 특정 알림 읽음 처리
   */
  async markAsRead(notificationId: number, userId: number) {
    this.logger.log(`Marking notification ${notificationId} as read for user: ${userId}`);
    return this.natsClient.send(
      'notification.mark_as_read',
      { notificationId, userId: String(userId) },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * 모든 알림 읽음 처리
   */
  async markAllAsRead(userId: number) {
    this.logger.log(`Marking all notifications as read for user: ${userId}`);
    return this.natsClient.send(
      'notification.mark_all_as_read',
      { userId: String(userId) },
      NATS_TIMEOUTS.QUICK,
    );
  }

  /**
   * 알림 삭제
   */
  async deleteNotification(notificationId: number, userId: number) {
    this.logger.log(`Deleting notification ${notificationId} for user: ${userId}`);
    return this.natsClient.send(
      'notification.delete',
      { notificationId, userId: String(userId) },
      NATS_TIMEOUTS.QUICK,
    );
  }

  // ==================== Legacy Email/SMS ====================

  async sendEmail(data: { to: string; subject: string; template: string; context: any }) {
    this.logger.log(`Sending email to: ${data.to}`);
    return this.natsClient.send('notify.send.email', data);
  }

  async sendSMS(data: { to: string; message: string }) {
    this.logger.log(`Sending SMS to: ${data.to}`);
    return this.natsClient.send('notify.send.sms', data);
  }

  async sendBookingConfirmation(bookingId: string) {
    this.logger.log(`Sending booking confirmation for: ${bookingId}`);
    return this.natsClient.send('notify.booking.confirmation', { bookingId });
  }

  async sendBookingCancellation(bookingId: string) {
    this.logger.log(`Sending booking cancellation for: ${bookingId}`);
    return this.natsClient.send('notify.booking.cancellation', { bookingId });
  }
}
