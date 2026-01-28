import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../dto/notification.dto';
import { Notification, NotificationStatus } from '@prisma/client';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for user: ${createNotificationDto.userId}`);

    return this.prisma.notification.create({
      data: createNotificationDto,
    });
  }

  async findAll(userId: string, query: NotificationQueryDto): Promise<{
    notifications: Notification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page = 1, limit = 20, type, status, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (type) where.type = type;
    if (status) where.status = status;
    if (unreadOnly) where.readAt = null;

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      notifications,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async update(id: number, userId: string, updateNotificationDto: UpdateNotificationDto): Promise<Notification> {
    await this.findOne(id, userId); // Check if exists and belongs to user

    return this.prisma.notification.update({
      where: { id },
      data: updateNotificationDto,
    });
  }

  async markAsRead(id: number, userId: string): Promise<Notification> {
    return this.update(id, userId, {
      status: NotificationStatus.READ,
      readAt: new Date().toISOString(),
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        status: NotificationStatus.READ,
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async remove(id: number, userId: string): Promise<void> {
    await this.findOne(id, userId); // Check if exists and belongs to user

    await this.prisma.notification.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  async sendToMultipleUsers(sendNotificationDto: SendNotificationDto): Promise<Notification[]> {
    const { userIds, ...notificationData } = sendNotificationDto;
    
    this.logger.log(`Sending notification to ${userIds.length} users`);

    const notifications = await Promise.all(
      userIds.map(userId =>
        this.create({
          ...notificationData,
          userId,
        })
      )
    );

    return notifications;
  }

  async findScheduledNotifications(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        scheduledAt: {
          lte: new Date(),
        },
        status: NotificationStatus.PENDING,
      },
    });
  }

  async markAsSent(id: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      },
    });
  }

  async markAsFailed(id: number): Promise<Notification> {
    return this.prisma.notification.update({
      where: { id },
      data: {
        status: NotificationStatus.FAILED,
        retryCount: {
          increment: 1,
        },
      },
    });
  }

  async findFailedNotificationsForRetry(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: {
          lt: 3, // maxRetries default value
        },
      },
    });
  }

  /**
   * 지수 백오프를 적용한 재시도 대상 알림 조회
   * retryCount에 따라 다음 재시도 시간이 계산됨:
   * - retryCount 1: 1분 후
   * - retryCount 2: 4분 후 (2^2)
   * - retryCount 3: 8분 후 (2^3)
   */
  async findFailedNotificationsForRetryWithBackoff(): Promise<Notification[]> {
    const now = new Date();

    // 재시도 대상 알림 조회 (maxRetries 미만 && 백오프 시간 경과)
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: {
          lt: 3,
        },
      },
    });

    // 지수 백오프 필터링
    return notifications.filter((notification) => {
      const backoffMinutes = Math.pow(2, notification.retryCount); // 2^retryCount 분
      const nextRetryTime = new Date(
        notification.updatedAt.getTime() + backoffMinutes * 60 * 1000,
      );
      return now >= nextRetryTime;
    });
  }

  /**
   * 최대 재시도 횟수 초과한 알림 조회 (DLQ 이동 대상)
   */
  async findPermanentlyFailedNotifications(): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: {
        status: NotificationStatus.FAILED,
        retryCount: {
          gte: 3, // maxRetries default value
        },
      },
    });
  }
}