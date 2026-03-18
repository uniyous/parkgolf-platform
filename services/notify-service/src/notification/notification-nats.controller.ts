import { Controller, Logger } from '@nestjs/common';
import { EventPattern, MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationService } from './service/notification.service';
import { TemplateService } from './service/template.service';
import { DeliveryService } from './service/delivery.service';
import { NotificationType, DeliveryChannelType, Prisma } from '@prisma/client';
import { NatsResponse } from '../common/types';

/** BFF wraps payload as { data: ... } — unwrap if present */
function extractPayload<T>(payload: T): T {
  if (typeof payload === 'object' && payload !== null && 'data' in payload) {
    const wrapped = payload as Record<string, unknown>;
    if (typeof wrapped.data === 'object' && wrapped.data !== null) {
      return wrapped.data as T;
    }
  }
  return payload;
}

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

interface BookingRefundCompletedEvent {
  bookingId: number;
  bookingNumber: string;
  userId: number;
  cancelAmount: number;
  refundedAt: string;
  userEmail?: string;
  userName?: string;
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
  data?: Prisma.InputJsonValue;
  deliveryChannel?: DeliveryChannelType;
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

  // ===== Ping Handler =====

  @MessagePattern('notification.ping')
  async ping(@Payload() payload: { ping: boolean; timestamp: string }) {
    this.logger.debug(`NATS ping received: ${payload.timestamp}`);
    return {
      pong: true,
      service: 'notify-service',
      timestamp: new Date().toISOString(),
    };
  }

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
        deliveryChannel: DeliveryChannelType.PUSH,
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
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle booking.cancelled event: ${error}`);
    }
  }

  @EventPattern('booking.refundCompleted')
  async handleRefundCompleted(@Payload() data: BookingRefundCompletedEvent) {
    this.logger.log(`NATS Event: booking.refundCompleted - ${data.bookingNumber}`);

    try {
      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.REFUND_COMPLETED,
        title: '환불이 완료되었습니다',
        message: `예약번호 ${data.bookingNumber}의 환불(${data.cancelAmount.toLocaleString()}원)이 완료되었습니다.`,
        data: {
          bookingId: data.bookingId,
          bookingNumber: data.bookingNumber,
          cancelAmount: data.cancelAmount,
          refundedAt: data.refundedAt,
        },
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle booking.refundCompleted event: ${error}`);
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
        deliveryChannel: DeliveryChannelType.PUSH,
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
        deliveryChannel: DeliveryChannelType.PUSH,
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
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle chat.message event: ${error}`);
    }
  }

  @EventPattern('payment.splitRequested')
  async handleSplitPaymentRequested(@Payload() data: {
    bookerId: number;
    bookerName: string;
    bookingGroupId: number;
    chatRoomId: string;
    participants: Array<{
      userId: number;
      userName: string;
      amount: number;
    }>;
  }) {
    this.logger.log(`NATS Event: payment.splitRequested - booker ${data.bookerId}, group ${data.bookingGroupId}`);

    try {
      for (const participant of data.participants) {
        const notification = await this.notificationService.create({
          userId: String(participant.userId),
          type: NotificationType.SPLIT_PAYMENT_REQUEST,
          title: `${data.bookerName}님이 더치페이를 요청했습니다`,
          message: `${participant.amount.toLocaleString()}원을 결제해 주세요.`,
          data: {
            bookingGroupId: data.bookingGroupId,
            chatRoomId: data.chatRoomId,
            bookerId: data.bookerId,
            bookerName: data.bookerName,
            amount: participant.amount,
          },
          deliveryChannel: DeliveryChannelType.PUSH,
        });

        await this.deliveryService.deliverNotification(notification);
      }
    } catch (error) {
      this.logger.error(`Failed to handle payment.splitRequested event: ${error}`);
    }
  }

  @EventPattern('notification.dismiss')
  async handleDismiss(@Payload() data: { userId: string; type: string; dataFilter?: Record<string, any> }) {
    this.logger.log(`NATS Event: notification.dismiss - user ${data.userId}, type ${data.type}`);
    try {
      const result = await this.notificationService.dismissByType(
        data.userId, data.type as NotificationType, data.dataFilter,
      );
      this.logger.log(`Dismissed ${result.count} notifications for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to dismiss notifications: ${error}`);
    }
  }

  // ===== Admin Dashboard Stats =====

  @MessagePattern('notifications.stats')
  async getNotificationStats(@Payload() data: { dateRange: { startDate: string; endDate: string }; token?: string }) {
    this.logger.log('NATS: Received notifications.stats request');
    const stats = await this.notificationService.getStats(data.dateRange);
    return NatsResponse.success(stats);
  }

  // ===== MessagePattern Handlers (Request-Response) =====

  @MessagePattern('notification.send')
  async sendNotification(@Payload() payload: SendNotificationPayload) {
    const data = extractPayload(payload);
    this.logger.log(`NATS: notification.send for user ${data.userId}`);

    const notification = await this.notificationService.create(data);
    await this.deliveryService.deliverNotification(notification);

    return NatsResponse.success({ id: notification.id });
  }

  @MessagePattern('notification.get_user_notifications')
  async getUserNotifications(@Payload() payload: GetNotificationsPayload) {
    const data = extractPayload(payload);
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
    const data = extractPayload(payload);
    const { notificationId, userId } = data;

    this.logger.log(`NATS: notification.mark_as_read - ${notificationId}`);

    const notification = await this.notificationService.markAsRead(notificationId, userId);

    return NatsResponse.success(notification);
  }

  @MessagePattern('notification.get_unread_count')
  async getUnreadCount(@Payload() payload: GetUnreadCountPayload) {
    const data = extractPayload(payload);
    const { userId } = data;

    this.logger.log(`NATS: notification.get_unread_count for user ${userId}`);

    const count = await this.notificationService.getUnreadCount(userId);

    return NatsResponse.count(count);
  }

  @MessagePattern('notification.mark_all_as_read')
  async markAllAsRead(@Payload() payload: GetUnreadCountPayload) {
    const data = extractPayload(payload);
    const { userId } = data;

    this.logger.log(`NATS: notification.mark_all_as_read for user ${userId}`);

    const result = await this.notificationService.markAllAsRead(userId);

    return NatsResponse.success(result);
  }

  @MessagePattern('notification.delete')
  async deleteNotification(@Payload() payload: DeleteNotificationPayload) {
    const data = extractPayload(payload);
    const { notificationId, userId } = data;

    this.logger.log(`NATS: notification.delete - ${notificationId}`);

    await this.notificationService.remove(notificationId, userId);

    return NatsResponse.deleted();
  }

  // ===== Account Deletion Event Handlers =====

  @EventPattern('user.deleted')
  async handleUserDeleted(@Payload() data: { userId: number; email: string; deletedAt: string }) {
    this.logger.log(`NATS Event: user.deleted - userId=${data.userId}`);

    try {
      await this.notificationService.deleteAllByUser(String(data.userId));
      this.logger.log(`Deleted all notifications for user ${data.userId}`);
    } catch (error) {
      this.logger.error(`Failed to handle user.deleted event: ${error}`);
    }
  }

  @EventPattern('user.deletion.requested')
  async handleDeletionRequested(@Payload() data: {
    userId: number;
    email: string;
    name: string;
    reason?: string;
    requestedAt: string;
    scheduledAt: string;
  }) {
    this.logger.log(`NATS Event: user.deletion.requested - userId=${data.userId}`);

    try {
      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.SYSTEM_ALERT,
        title: '계정 삭제가 요청되었습니다',
        message: `계정 삭제가 요청되었습니다. ${data.scheduledAt.split('T')[0]}까지 로그인하시면 삭제가 취소됩니다.`,
        data: {
          type: 'ACCOUNT_DELETION_REQUESTED',
          scheduledAt: data.scheduledAt,
        },
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle user.deletion.requested event: ${error}`);
    }
  }

  @EventPattern('user.deletion.cancelled')
  async handleDeletionCancelled(@Payload() data: {
    userId: number;
    email: string;
    name: string;
    cancelledAt: string;
  }) {
    this.logger.log(`NATS Event: user.deletion.cancelled - userId=${data.userId}`);

    try {
      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.SYSTEM_ALERT,
        title: '계정 삭제가 취소되었습니다',
        message: '계정 삭제 요청이 취소되었습니다. 정상적으로 서비스를 이용하실 수 있습니다.',
        data: {
          type: 'ACCOUNT_DELETION_CANCELLED',
          cancelledAt: data.cancelledAt,
        },
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle user.deletion.cancelled event: ${error}`);
    }
  }

  // ===== Admin Notification List =====

  @MessagePattern('notifications.list')
  async listNotifications(@Payload() payload: { filters?: Record<string, string>; page?: number; limit?: number; token?: string }) {
    const { filters = {}, page = 1, limit = 20 } = payload || {};
    this.logger.log(`NATS: notifications.list - page=${page}, limit=${limit}`);

    const result = await this.notificationService.findAllAdmin({ ...filters, page: Number(page), limit: Number(limit) });
    return NatsResponse.paginated(result.notifications, result.total, result.page, Number(limit));
  }

  // ===== Template CRUD Handlers =====

  @MessagePattern('templates.list')
  async listTemplates(@Payload() payload: { page?: number; limit?: number; token?: string }) {
    const { page = 1, limit = 20 } = payload || {};
    this.logger.log(`NATS: templates.list - page=${page}, limit=${limit}`);

    const templates = await this.templateService.findAll();
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;
    const start = (pageNum - 1) * limitNum;
    const paged = templates.slice(start, start + limitNum);

    return NatsResponse.paginated(paged, templates.length, pageNum, limitNum);
  }

  @MessagePattern('templates.get')
  async getTemplate(@Payload() payload: { id: number; token?: string }) {
    const { id } = extractPayload(payload);
    this.logger.log(`NATS: templates.get - id=${id}`);

    const template = await this.templateService.findOne(Number(id));
    return NatsResponse.success(template);
  }

  @MessagePattern('templates.create')
  async createTemplate(@Payload() payload: { token?: string; [key: string]: unknown }) {
    const data = extractPayload(payload);
    this.logger.log(`NATS: templates.create`);
    const { token, ...dto } = data as Record<string, unknown>;

    const template = await this.templateService.create(dto as any);
    return NatsResponse.success(template);
  }

  @MessagePattern('templates.update')
  async updateTemplate(@Payload() payload: { id: number; data: Record<string, unknown>; token?: string }) {
    const { id, data } = extractPayload(payload);
    this.logger.log(`NATS: templates.update - id=${id}`);

    const template = await this.templateService.update(Number(id), data as any);
    return NatsResponse.success(template);
  }

  @MessagePattern('templates.delete')
  async deleteTemplate(@Payload() payload: { id: number; token?: string }) {
    const { id } = extractPayload(payload);
    this.logger.log(`NATS: templates.delete - id=${id}`);

    await this.templateService.remove(Number(id));
    return NatsResponse.deleted();
  }

  @EventPattern('user.deletion.reminder')
  async handleDeletionReminder(@Payload() data: {
    userId: number;
    email: string;
    name: string;
    daysRemaining: number;
    scheduledAt: string;
  }) {
    this.logger.log(`NATS Event: user.deletion.reminder - userId=${data.userId}, D-${data.daysRemaining}`);

    try {
      const notification = await this.notificationService.create({
        userId: String(data.userId),
        type: NotificationType.SYSTEM_ALERT,
        title: `계정 삭제 ${data.daysRemaining}일 전`,
        message: `계정이 ${data.daysRemaining}일 후 삭제됩니다. 유지하시려면 로그인해 주세요.`,
        data: {
          type: 'ACCOUNT_DELETION_REMINDER',
          daysRemaining: data.daysRemaining,
          scheduledAt: data.scheduledAt,
        },
        deliveryChannel: DeliveryChannelType.PUSH,
      });

      await this.deliveryService.deliverNotification(notification);
    } catch (error) {
      this.logger.error(`Failed to handle user.deletion.reminder event: ${error}`);
    }
  }
}
