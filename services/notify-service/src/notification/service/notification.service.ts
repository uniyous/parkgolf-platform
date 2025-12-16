import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../dto/notification.dto';
import { Notification, NotificationStatus, NotificationType } from '@prisma/client';
import { handlePrismaError } from '../../common/utils/prisma-error.handler';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for user: ${createNotificationDto.userId}`);
    
    try {
      return await this.prisma.notification.create({
        data: createNotificationDto,
      });
    } catch (error) {
      this.logger.error(`Failed to create notification for user ${createNotificationDto.userId}`, error);
      handlePrismaError(error);
    }
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
}