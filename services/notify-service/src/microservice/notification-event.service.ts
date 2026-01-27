import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from '../notification/service/notification.service';
import { TemplateService } from '../notification/service/template.service';
import { DeliveryService } from '../notification/service/delivery.service';
import { NotificationType } from '@prisma/client';

interface BookingEvent {
  bookingId: string;
  userId: string;
  courseId: string;
  courseName: string;
  bookingDate: string;
  bookingTime: string;
  status: string;
}

interface PaymentEvent {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  status: string;
  failureReason?: string;
}

interface NotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  deliveryChannel?: string;
  scheduledAt?: string;
}

@Controller()
export class NotificationEventService {
  private readonly logger = new Logger(NotificationEventService.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: TemplateService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // Event Handlers - Listen to events from other services
  @EventPattern('booking.confirmed')
  async handleBookingConfirmed(@Payload() data: BookingEvent) {
    this.logger.log(`Handling booking confirmed event: ${data.bookingId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CONFIRMED,
        {
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          bookingId: data.bookingId,
        }
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: templateData?.title || '예약이 확정되었습니다',
        message: templateData?.message || `${data.courseName}에서 ${data.bookingDate} ${data.bookingTime} 예약이 확정되었습니다.`,
        data: {
          bookingId: data.bookingId,
          courseId: data.courseId,
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
        },
        deliveryChannel: 'EMAIL',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error('Failed to handle booking confirmed event:', error);
    }
  }

  @EventPattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: BookingEvent) {
    this.logger.log(`Handling booking cancelled event: ${data.bookingId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CANCELLED,
        {
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          bookingId: data.bookingId,
        }
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.BOOKING_CANCELLED,
        title: templateData?.title || '예약이 취소되었습니다',
        message: templateData?.message || `${data.courseName}에서 ${data.bookingDate} ${data.bookingTime} 예약이 취소되었습니다.`,
        data: {
          bookingId: data.bookingId,
          courseId: data.courseId,
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
        },
        deliveryChannel: 'EMAIL',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error('Failed to handle booking cancelled event:', error);
    }
  }

  @EventPattern('payment.success')
  async handlePaymentSuccess(@Payload() data: PaymentEvent) {
    this.logger.log(`Handling payment success event: ${data.paymentId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.PAYMENT_SUCCESS,
        {
          amount: data.amount,
          paymentId: data.paymentId,
          bookingId: data.bookingId,
        }
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: templateData?.title || '결제가 완료되었습니다',
        message: templateData?.message || `${data.amount}원 결제가 성공적으로 완료되었습니다.`,
        data: {
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          amount: data.amount,
        },
        deliveryChannel: 'EMAIL',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error('Failed to handle payment success event:', error);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: PaymentEvent) {
    this.logger.log(`Handling payment failed event: ${data.paymentId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.PAYMENT_FAILED,
        {
          amount: data.amount,
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          failureReason: data.failureReason || '알 수 없는 오류',
        }
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.PAYMENT_FAILED,
        title: templateData?.title || '결제가 실패했습니다',
        message: templateData?.message || `${data.amount}원 결제가 실패했습니다. 다시 시도해 주세요.`,
        data: {
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          amount: data.amount,
          failureReason: data.failureReason,
        },
        deliveryChannel: 'EMAIL',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error('Failed to handle payment failed event:', error);
    }
  }

  // RPC Message Handlers
  @MessagePattern('notification.send')
  async sendNotification(@Payload() data: NotificationRequest) {
    this.logger.log(`Handling send notification request for user: ${data.userId}`);

    try {
      const notification = await this.notificationService.create(data);
      await this.deliveryService.deliverNotification(notification);

      return {
        success: true,
        notificationId: notification.id,
        message: 'Notification sent successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to send notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('notification.get_user_notifications')
  async getUserNotifications(@Payload() data: { userId: string; query?: any }) {
    this.logger.log(`Getting notifications for user: ${data.userId}`);

    try {
      const result = await this.notificationService.findAll(data.userId, data.query || {});
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error('Failed to get user notifications:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('notification.mark_as_read')
  async markAsRead(@Payload() data: { notificationId: number; userId: string }) {
    this.logger.log(`Marking notification ${data.notificationId} as read for user ${data.userId}`);

    try {
      const notification = await this.notificationService.markAsRead(data.notificationId, data.userId);
      return {
        success: true,
        data: notification,
      };
    } catch (error: any) {
      this.logger.error('Failed to mark notification as read:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('notification.get_unread_count')
  async getUnreadCount(@Payload() data: { userId: string }) {
    this.logger.log(`Getting unread count for user: ${data.userId}`);

    try {
      const count = await this.notificationService.getUnreadCount(data.userId);
      return {
        success: true,
        count,
      };
    } catch (error: any) {
      this.logger.error('Failed to get unread count:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('notification.mark_all_as_read')
  async markAllAsRead(@Payload() data: { userId: string }) {
    this.logger.log(`Marking all notifications as read for user: ${data.userId}`);

    try {
      const result = await this.notificationService.markAllAsRead(data.userId);
      return {
        success: true,
        data: result,
      };
    } catch (error: any) {
      this.logger.error('Failed to mark all notifications as read:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @MessagePattern('notification.delete')
  async deleteNotification(@Payload() data: { notificationId: number; userId: string }) {
    this.logger.log(`Deleting notification ${data.notificationId} for user: ${data.userId}`);

    try {
      await this.notificationService.remove(data.notificationId, data.userId);
      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to delete notification:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
