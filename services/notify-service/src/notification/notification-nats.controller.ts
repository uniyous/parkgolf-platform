import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './service/notification.service';
import { TemplateService } from './service/template.service';
import { DeliveryService } from './service/delivery.service';
import { NotificationType } from '@prisma/client';
import { NatsResponse } from '../common/types';

// ===== Event Payload Interfaces =====

interface BookingConfirmedEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameName: string;
  bookingDate: string;
  timeSlot: string;
  confirmedAt: string;
  userEmail?: string;
  userName?: string;
}

interface BookingCancelledEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  gameId: number;
  gameName: string;
  bookingDate: string;
  timeSlot: string;
  reason: string;
  cancelledAt: string;
  userEmail?: string;
  userName?: string;
}

interface PaymentEvent {
  paymentId: string;
  bookingId: string;
  userId: string;
  amount: number;
  status: string;
  failureReason?: string;
}

interface FriendRequestEvent {
  requestId: number;
  fromUserId: number;
  toUserId: number;
  fromUserName: string;
  message?: string;
  createdAt: string;
}

interface FriendAcceptedEvent {
  requestId: number;
  fromUserId: number;
  toUserId: number;
  fromUserName: string;
  toUserName: string;
  acceptedAt: string;
}

interface ChatMessageEvent {
  chatRoomId: string;
  senderId: number;
  senderName: string;
  recipientId: number;
  messagePreview: string;
  createdAt: string;
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
  async handleBookingConfirmed(@Payload() data: BookingConfirmedEvent) {
    this.logger.log(`NATS Event: booking.confirmed - ${data.bookingNumber}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CONFIRMED,
        {
          courseName: data.gameName,
          bookingDate: data.bookingDate,
          bookingTime: data.timeSlot,
          bookingId: data.bookingNumber,
        },
      );

      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.BOOKING_CONFIRMED,
        title: templateData?.title || '예약이 확정되었습니다',
        message:
          templateData?.message ||
          `${data.gameName}에서 ${data.bookingDate} ${data.timeSlot} 예약이 확정되었습니다.`,
        data: {
          bookingId: data.bookingId,
          bookingNumber: data.bookingNumber,
          gameId: data.gameId,
          gameName: data.gameName,
          bookingDate: data.bookingDate,
          timeSlot: data.timeSlot,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle booking.confirmed event: ${error}`);
    }
  }

  @EventPattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: BookingCancelledEvent) {
    this.logger.log(`NATS Event: booking.cancelled - ${data.bookingNumber}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.BOOKING_CANCELLED,
        {
          courseName: data.gameName,
          bookingDate: data.bookingDate,
          bookingTime: data.timeSlot,
          bookingId: data.bookingNumber,
        },
      );

      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.BOOKING_CANCELLED,
        title: templateData?.title || '예약이 취소되었습니다',
        message:
          templateData?.message ||
          `${data.gameName}에서 ${data.bookingDate} ${data.timeSlot} 예약이 취소되었습니다.`,
        data: {
          bookingId: data.bookingId,
          bookingNumber: data.bookingNumber,
          gameId: data.gameId,
          gameName: data.gameName,
          bookingDate: data.bookingDate,
          timeSlot: data.timeSlot,
          reason: data.reason,
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

  @EventPattern('friend.request')
  async handleFriendRequest(@Payload() data: FriendRequestEvent) {
    this.logger.log(`NATS Event: friend.request - from ${data.fromUserId} to ${data.toUserId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.FRIEND_REQUEST,
        {
          fromUserName: data.fromUserName,
          message: data.message || '',
        },
      );

      const notification = await this.notificationService.create({
        userId: String(data.toUserId),
        type: NotificationType.FRIEND_REQUEST,
        title: templateData?.title || `${data.fromUserName}님이 친구 요청을 보냈습니다`,
        message: templateData?.message || data.message || '친구 요청을 확인해 주세요.',
        data: {
          requestId: data.requestId,
          fromUserId: data.fromUserId,
          fromUserName: data.fromUserName,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle friend.request event: ${error}`);
    }
  }

  @EventPattern('friend.accepted')
  async handleFriendAccepted(@Payload() data: FriendAcceptedEvent) {
    this.logger.log(`NATS Event: friend.accepted - ${data.toUserName} accepted ${data.fromUserName}'s request`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.FRIEND_ACCEPTED,
        {
          toUserName: data.toUserName,
        },
      );

      // 요청자(fromUserId)에게 알림 발송
      const notification = await this.notificationService.create({
        userId: String(data.fromUserId),
        type: NotificationType.FRIEND_ACCEPTED,
        title: templateData?.title || '친구 요청이 수락되었습니다',
        message: templateData?.message || `${data.toUserName}님과 친구가 되었습니다.`,
        data: {
          requestId: data.requestId,
          friendId: data.toUserId,
          friendName: data.toUserName,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle friend.accepted event: ${error}`);
    }
  }

  @EventPattern('chat.message')
  async handleChatMessage(@Payload() data: ChatMessageEvent) {
    this.logger.log(`NATS Event: chat.message - from ${data.senderId} to ${data.recipientId}`);

    try {
      const templateData = await this.templateService.generateNotificationFromTemplate(
        NotificationType.CHAT_MESSAGE,
        {
          senderName: data.senderName,
          messagePreview: data.messagePreview,
        },
      );

      const notification = await this.notificationService.create({
        userId: String(data.recipientId),
        type: NotificationType.CHAT_MESSAGE,
        title: templateData?.title || `${data.senderName}님의 새 메시지`,
        message: templateData?.message || data.messagePreview,
        data: {
          chatRoomId: data.chatRoomId,
          senderId: data.senderId,
          senderName: data.senderName,
        },
        deliveryChannel: 'PUSH',
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle chat.message event: ${error}`);
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
