import { Injectable, Logger } from '@nestjs/common';
import { eq, and, count, gte, desc, sql } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { notifications, deadLetterNotifications, type Notification } from '../../db/schema';
import { NotificationType } from '../../contracts/enums';
import { AppException } from '../../common/exceptions/app.exception';
import { Errors } from '../../common/exceptions/catalog/error-catalog';

const DEFAULT_MAX_RETRIES = 3;

interface DeadLetterStats {
  total: number;
  byType: Record<string, number>;
  byReason: Record<string, number>;
  lastDay: number;
  lastWeek: number;
}

@Injectable()
export class DeadLetterService {
  private readonly logger = new Logger(DeadLetterService.name);

  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async moveToDeadLetter(notification: Notification, reason: string): Promise<void> {
    this.logger.warn(`Moving notification ${notification.id} to dead letter queue. Reason: ${reason}`);
    try {
      await this.db.transaction(async (tx) => {
        await tx.insert(deadLetterNotifications).values({
          originalId: notification.id,
          userId: notification.userId,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          deliveryChannel: notification.deliveryChannel,
          failureReason: reason,
          retryCount: notification.retryCount,
        });
        await tx.delete(notifications).where(eq(notifications.id, notification.id));
      });
      this.logger.log(`Notification ${notification.id} moved to dead letter queue`);
    } catch (error) {
      this.logger.error(`Failed to move notification ${notification.id} to dead letter: ${(error as Error).message}`);
      throw error;
    }
  }

  async findAll(options?: { userId?: string; type?: NotificationType; page?: number; limit?: number }) {
    const { userId, type, page = 1, limit = 20 } = options || {};
    const conds = [];
    if (userId) conds.push(eq(deadLetterNotifications.userId, userId));
    if (type) conds.push(eq(deadLetterNotifications.type, type));
    const where = conds.length ? and(...conds) : undefined;

    const [items, totalRows] = await Promise.all([
      this.db.select().from(deadLetterNotifications).where(where).orderBy(desc(deadLetterNotifications.movedAt)).limit(limit).offset((page - 1) * limit),
      this.db.select({ value: count() }).from(deadLetterNotifications).where(where),
    ]);
    const total = totalRows[0].value;
    return { items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getStats(): Promise<DeadLetterStats> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [totalRows, lastDayRows, lastWeekRows, byType] = await Promise.all([
      this.db.select({ value: count() }).from(deadLetterNotifications),
      this.db.select({ value: count() }).from(deadLetterNotifications).where(gte(deadLetterNotifications.movedAt, oneDayAgo)),
      this.db.select({ value: count() }).from(deadLetterNotifications).where(gte(deadLetterNotifications.movedAt, oneWeekAgo)),
      this.db.select({ type: deadLetterNotifications.type, count: count() }).from(deadLetterNotifications).groupBy(deadLetterNotifications.type),
    ]);

    const typeStats: Record<string, number> = {};
    for (const item of byType) typeStats[item.type] = item.count;

    const reasonGroups = await this.db
      .select({ failureReason: deadLetterNotifications.failureReason, count: count() })
      .from(deadLetterNotifications)
      .groupBy(deadLetterNotifications.failureReason)
      .orderBy(sql`count(*) DESC`)
      .limit(10);

    const reasonStats: Record<string, number> = {};
    for (const item of reasonGroups) reasonStats[item.failureReason] = item.count;

    return { total: totalRows[0].value, byType: typeStats, byReason: reasonStats, lastDay: lastDayRows[0].value, lastWeek: lastWeekRows[0].value };
  }

  async retry(deadLetterId: number): Promise<Notification> {
    const [deadLetter] = await this.db.select().from(deadLetterNotifications).where(eq(deadLetterNotifications.id, deadLetterId)).limit(1);
    if (!deadLetter) {
      throw new AppException(Errors.Notification.NOT_FOUND, `Dead letter notification ${deadLetterId} not found`);
    }

    const notification = await this.db.transaction(async (tx) => {
      const [created] = await tx
        .insert(notifications)
        .values({
          userId: deadLetter.userId,
          type: deadLetter.type,
          title: deadLetter.title,
          message: deadLetter.message,
          data: deadLetter.data,
          deliveryChannel: deadLetter.deliveryChannel,
          retryCount: 0,
          maxRetries: DEFAULT_MAX_RETRIES,
        })
        .returning();
      await tx.delete(deadLetterNotifications).where(eq(deadLetterNotifications.id, deadLetterId));
      return created;
    });

    this.logger.log(`Dead letter ${deadLetterId} restored as notification ${notification.id}`);
    return notification;
  }

  async cleanup(retentionDays = 30): Promise<number> {
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const rows = await this.db
      .delete(deadLetterNotifications)
      .where(sql`${deadLetterNotifications.movedAt} < ${threshold}`)
      .returning({ id: deadLetterNotifications.id });
    this.logger.log(`Cleaned up ${rows.length} old dead letter notifications`);
    return rows.length;
  }
}
