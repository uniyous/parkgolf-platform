import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from '../notification/service/notification.service';
import { TemplateService } from '../notification/service/template.service';
import { DeliveryService } from '../notification/service/delivery.service';
import { NotificationType } from '@prisma/client';
import { NatsResponse, NotificationPayload } from '../common/types';
import { AppException } from '../common/exceptions';
import { Errors } from '../common/exceptions/catalog/error-catalog';

// ===== Event Payload Interfaces =====

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

interface SendNotificationPayload {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  deliveryChannel?: string;
  scheduledAt?: string;
}

interface GetNotificationsPayload {
  userId: string;
  query?: {
    page?: number;
    limit?: number;
    type?: NotificationType;
    unreadOnly?: boolean;
  };
}

interface MarkAsReadPayload {
  notificationId: number;
  userId: string;
}

interface GetUnreadCountPayload {
  userId: string;
}

interface DeleteNotificationPayload {
  notificationId: number;
  userId: string;
}

@Controller()
export class NotificationNatsController {
  private readonly logger = new Logger(NotificationNatsController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly templateService: TemplateService,
    private readonly deliveryService: DeliveryService,
  ) {}

  // ===== Event Handlers (Fire-and-forget) =====

  @EventPattern('booking.confirmed')
  async handleBookingConfirmed(@Payload() data: BookingEvent) {
    this.logger.log(`NATS Event: booking.confirmed - ${data.bookingId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CONFIRMED,
        {
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          bookingId: data.bookingId,
        },
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.BOOKING_CONFIRMED,
        title: templateData?.title || '예약이 확정되었습니다',
        message:
          templateData?.message ||
          `${data.courseName}에서 ${data.bookingDate} ${data.bookingTime} 예약이 확정되었습니다.`,
        data: {
          bookingId: data.bookingId,
          courseId: data.courseId,
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle booking.confirmed event: ${error}`);
    }
  }

  @EventPattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: BookingEvent) {
    this.logger.log(`NATS Event: booking.cancelled - ${data.bookingId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CANCELLED,
        {
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
          bookingId: data.bookingId,
        },
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.BOOKING_CANCELLED,
        title: templateData?.title || '예약이 취소되었습니다',
        message:
          templateData?.message ||
          `${data.courseName}에서 ${data.bookingDate} ${data.bookingTime} 예약이 취소되었습니다.`,
        data: {
          bookingId: data.bookingId,
          courseId: data.courseId,
          courseName: data.courseName,
          bookingDate: data.bookingDate,
          bookingTime: data.bookingTime,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle booking.cancelled event: ${error}`);
    }
  }

  @EventPattern('payment.success')
  async handlePaymentSuccess(@Payload() data: PaymentEvent) {
    this.logger.log(`NATS Event: payment.success - ${data.paymentId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.PAYMENT_SUCCESS,
        {
          amount: data.amount,
          paymentId: data.paymentId,
          bookingId: data.bookingId,
        },
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.PAYMENT_SUCCESS,
        title: templateData?.title || '결제가 완료되었습니다',
        message:
          templateData?.message ||
          `${data.amount.toLocaleString()}원 결제가 성공적으로 완료되었습니다.`,
        data: {
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          amount: data.amount,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle payment.success event: ${error}`);
    }
  }

  @EventPattern('payment.failed')
  async handlePaymentFailed(@Payload() data: PaymentEvent) {
    this.logger.log(`NATS Event: payment.failed - ${data.paymentId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.PAYMENT_FAILED,
        {
          amount: data.amount,
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          failureReason: data.failureReason || '알 수 없는 오류',
        },
      );

      const notification = await this.notificationService.create({
        userId: data.userId,
        type: NotificationType.PAYMENT_FAILED,
        title: templateData?.title || '결제가 실패했습니다',
        message:
          templateData?.message ||
          `${data.amount.toLocaleString()}원 결제가 실패했습니다. 다시 시도해 주세요.`,
        data: {
          paymentId: data.paymentId,
          bookingId: data.bookingId,
          amount: data.amount,
          failureReason: data.failureReason,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle payment.failed event: ${error}`);
    }
  }

  // ===== MessagePattern Handlers (Request-Response) =====

  @MessagePattern('notification.send')
  async sendNotification(@Payload() payload: SendNotificationPayload) {
    const data = (payload as any).data || payload;
    this.logger.log(`NATS: notification.send for user ${data.userId}`);

    const notification = await this.notificationService.create(data);
    await this.deliveryService.deliverNotification(notification);

    return NatsResponse.success({ id: notification.id });
  }

  @MessagePattern('notification.get_user_notifications')
  async getUserNotifications(@Payload() payload: GetNotificationsPayload) {
    const data = (payload as any).data || payload;
    const { userId, query = {} } = data;
    const { page = 1, limit = 20 } = query;

    this.logger.log(`NATS: notification.get_user_notifications for user ${userId}`);

    const result = await this.notificationService.findAll(userId, query);

    return NatsResponse.paginated(
      result.notifications,
      result.total,
      result.page,
      limit,
    );
  }

  @MessagePattern('notification.mark_as_read')
  async markAsRead(@Payload() payload: MarkAsReadPayload) {
    const data = (payload as any).data || payload;
    const { notificationId, userId } = data;

    this.logger.log(`NATS: notification.mark_as_read - ${notificationId}`);

    const notification = await this.notificationService.markAsRead(notificationId, userId);

    return NatsResponse.success(notification);
  }

  @MessagePattern('notification.get_unread_count')
  async getUnreadCount(@Payload() payload: GetUnreadCountPayload) {
    const data = (payload as any).data || payload;
    const { userId } = data;

    this.logger.log(`NATS: notification.get_unread_count for user ${userId}`);

    const count = await this.notificationService.getUnreadCount(userId);

    return NatsResponse.count(count);
  }

  @MessagePattern('notification.mark_all_as_read')
  async markAllAsRead(@Payload() payload: GetUnreadCountPayload) {
    const data = (payload as any).data || payload;
    const { userId } = data;

    this.logger.log(`NATS: notification.mark_all_as_read for user ${userId}`);

    const result = await this.notificationService.markAllAsRead(userId);

    return NatsResponse.success(result);
  }

  @MessagePattern('notification.delete')
  async deleteNotification(@Payload() payload: DeleteNotificationPayload) {
    const data = (payload as any).data || payload;
    const { notificationId, userId } = data;

    this.logger.log(`NATS: notification.delete - ${notificationId}`);

    await this.notificationService.remove(notificationId, userId);

    return NatsResponse.deleted();
  }
}
