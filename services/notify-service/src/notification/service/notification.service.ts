import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { eq, and, or, count, desc, lt, lte, gte, isNull, sql } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { notifications, notificationSettings, type Notification } from '../../db/schema';
import { NotificationStatus, NotificationType } from '../../contracts/enums';
import { CreateNotificationDto, UpdateNotificationDto, NotificationQueryDto, SendNotificationDto } from '../dto/notification.dto';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

const DEFAULT_MAX_RETRIES = 3;

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    @Optional() @Inject('NOTIFICATION_GATEWAY') private readonly notificationGateway?: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async create(dto: CreateNotificationDto): Promise<Notification> {
    this.logger.log(`Creating notification for user: ${dto.userId}`);

    const [notification] = await this.db
      .insert(notifications)
      .values({
        userId: dto.userId,
        type: dto.type,
        title: dto.title,
        message: dto.message,
        data: dto.data,
        deliveryChannel: dto.deliveryChannel,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      })
      .returning();

    this.emitNotificationCreated(notification);
    return notification;
  }

  private emitNotificationCreated(notification: Notification): void {
    if (!this.notificationGateway) {
      this.logger.debug('NOTIFICATION_GATEWAY not available, skipping real-time delivery');
      return;
    }
    try {
      this.notificationGateway.emit('notification.created', {
        id: notification.id,
        userId: notification.userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        isRead: notification.readAt !== null,
        createdAt: notification.createdAt.toISOString(),
      });
      this.logger.log(`Emitted notification.created event for notification ${notification.id} to user ${notification.userId}`);
    } catch (error) {
      this.logger.error(`Failed to emit notification.created event: ${error}`);
    }
  }

  async findAll(userId: string, query: NotificationQueryDto): Promise<{ notifications: Notification[]; total: number; page: number; totalPages: number }> {
    const { page = 1, limit = 20, type, status, unreadOnly } = query;
    const conds = [eq(notifications.userId, userId)];
    if (type) conds.push(eq(notifications.type, type));
    if (status) conds.push(eq(notifications.status, status));
    if (unreadOnly) conds.push(isNull(notifications.readAt));
    const where = and(...conds);

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(notifications).where(where),
    ]);
    const total = totalRows[0].value;
    return { notifications: rows, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findAllAdmin(query: { page?: number; limit?: number; type?: string; status?: string; userId?: string }): Promise<{ notifications: Notification[]; total: number; page: number; totalPages: number }> {
    const pageNum = Number(query.page) || 1;
    const limitNum = Number(query.limit) || 20;
    const conds = [];
    if (query.type) conds.push(eq(notifications.type, query.type as NotificationType));
    if (query.status) conds.push(eq(notifications.status, query.status as NotificationStatus));
    if (query.userId) conds.push(eq(notifications.userId, query.userId));
    const where = conds.length ? and(...conds) : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db.select().from(notifications).where(where).orderBy(desc(notifications.createdAt)).limit(limitNum).offset((pageNum - 1) * limitNum),
      this.db.select({ value: count() }).from(notifications).where(where),
    ]);
    const total = totalRows[0].value;
    return { notifications: rows, total, page: pageNum, totalPages: Math.ceil(total / limitNum) };
  }

  async findOne(id: number, userId: string): Promise<Notification> {
    const [notification] = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1);
    if (!notification) throw new AppException(Errors.Notification.NOT_FOUND);
    return notification;
  }

  async update(id: number, userId: string, dto: UpdateNotificationDto): Promise<Notification> {
    await this.findOne(id, userId);
    const set: { status?: NotificationStatus; readAt?: Date } = {};
    if (dto.status !== undefined) set.status = dto.status;
    if (dto.readAt !== undefined) set.readAt = new Date(dto.readAt);
    const [row] = await this.db.update(notifications).set(set).where(eq(notifications.id, id)).returning();
    return row;
  }

  async markAsRead(id: number, userId: string): Promise<Notification> {
    return this.update(id, userId, { status: NotificationStatus.READ, readAt: new Date().toISOString() });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const rows = await this.db
      .update(notifications)
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id });
    return { count: rows.length };
  }

  async remove(id: number, userId: string): Promise<void> {
    await this.findOne(id, userId);
    await this.db.delete(notifications).where(eq(notifications.id, id));
  }

  async getUnreadCount(userId: string): Promise<number> {
    const [row] = await this.db.select({ value: count() }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
    return row.value;
  }

  // 관리자 대시보드 - 알림 통계
  async getStats(dateRange: { startDate: string; endDate: string }) {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    endDate.setHours(23, 59, 59, 999);
    const where = and(gte(notifications.createdAt, startDate), lte(notifications.createdAt, endDate));

    const [statusGroups, typeGroups] = await Promise.all([
      this.db.select({ status: notifications.status, count: count() }).from(notifications).where(where).groupBy(notifications.status),
      this.db.select({ type: notifications.type, count: count() }).from(notifications).where(where).groupBy(notifications.type),
    ]);

    const statusMap = new Map(statusGroups.map((g) => [g.status, g.count]));
    const pending = statusMap.get(NotificationStatus.PENDING) ?? 0;
    const sent = statusMap.get(NotificationStatus.SENT) ?? 0;
    const failed = statusMap.get(NotificationStatus.FAILED) ?? 0;
    const read = statusMap.get(NotificationStatus.READ) ?? 0;

    const total = pending + sent + failed + read;
    const delivered = sent + read;
    return {
      totalNotifications: total,
      sentNotifications: sent,
      deliveredNotifications: delivered,
      failedNotifications: failed,
      readNotifications: read,
      notificationsByType: typeGroups.map((g) => ({ type: g.type, count: g.count })),
      notificationsByStatus: statusGroups.map((g) => ({ status: g.status, count: g.count })),
      deliveryRate: total > 0 ? delivered / total : 0,
      readRate: delivered > 0 ? read / delivered : 0,
    };
  }

  async sendToMultipleUsers(dto: SendNotificationDto): Promise<Notification[]> {
    const { userIds, ...notificationData } = dto;
    this.logger.log(`Sending notification to ${userIds.length} users`);
    return Promise.all(userIds.map((userId) => this.create({ ...notificationData, userId })));
  }

  async findScheduledNotifications(): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(and(lte(notifications.scheduledAt, new Date()), eq(notifications.status, NotificationStatus.PENDING)));
  }

  async markAsSent(id: number): Promise<Notification> {
    const [row] = await this.db.update(notifications).set({ status: NotificationStatus.SENT, sentAt: new Date() }).where(eq(notifications.id, id)).returning();
    return row;
  }

  async markAsFailed(id: number): Promise<Notification> {
    const [row] = await this.db
      .update(notifications)
      .set({ status: NotificationStatus.FAILED, retryCount: sql`${notifications.retryCount} + 1` })
      .where(eq(notifications.id, id))
      .returning();
    return row;
  }

  async dismissByType(userId: string, type: NotificationType, dataFilter?: Record<string, unknown>): Promise<{ count: number }> {
    const conds = [eq(notifications.userId, userId), eq(notifications.type, type), isNull(notifications.readAt)];
    if (dataFilter) {
      const entries = Object.entries(dataFilter);
      if (entries.length === 1) {
        const [key, value] = entries[0];
        conds.push(sql`${notifications.data}->>${key} = ${String(value)}`);
      }
    }
    const rows = await this.db
      .update(notifications)
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where(and(...conds))
      .returning({ id: notifications.id });
    return { count: rows.length };
  }

  async deleteExpired(type: NotificationType, before: Date): Promise<number> {
    const rows = await this.db
      .delete(notifications)
      .where(and(eq(notifications.type, type), eq(notifications.status, NotificationStatus.READ), lt(notifications.createdAt, before)))
      .returning({ id: notifications.id });
    return rows.length;
  }

  async markExpiredAsRead(type: NotificationType, before: Date): Promise<number> {
    const rows = await this.db
      .update(notifications)
      .set({ status: NotificationStatus.READ, readAt: new Date() })
      .where(and(eq(notifications.type, type), isNull(notifications.readAt), lt(notifications.createdAt, before)))
      .returning({ id: notifications.id });
    return rows.length;
  }

  async findFailedNotificationsForRetry(): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.status, NotificationStatus.FAILED), lt(notifications.retryCount, DEFAULT_MAX_RETRIES)));
  }

  async findFailedNotificationsForRetryWithBackoff(): Promise<Notification[]> {
    const now = new Date();
    const rows = await this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.status, NotificationStatus.FAILED), lt(notifications.retryCount, DEFAULT_MAX_RETRIES)));
    return rows.filter((n) => {
      const backoffMinutes = Math.pow(2, n.retryCount);
      const nextRetryTime = new Date(n.updatedAt.getTime() + backoffMinutes * 60 * 1000);
      return now >= nextRetryTime;
    });
  }

  async findPermanentlyFailedNotifications(): Promise<Notification[]> {
    return this.db
      .select()
      .from(notifications)
      .where(and(eq(notifications.status, NotificationStatus.FAILED), gte(notifications.retryCount, DEFAULT_MAX_RETRIES)));
  }

  async deleteAllByUser(userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(notifications).where(eq(notifications.userId, userId));
      await tx.delete(notificationSettings).where(eq(notificationSettings.userId, userId));
    });
    this.logger.log(`Deleted all notifications and settings for user ${userId}`);
  }
}
