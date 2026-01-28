import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Notification, NotificationType } from '@prisma/client';

interface DeadLetterNotification {
  id: number;
  originalId: number;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: unknown;
  deliveryChannel: string | null;
  failureReason: string;
  retryCount: number;
  movedAt: Date;
}

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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 영구 실패한 알림을 Dead Letter Queue로 이동
   */
  async moveToDeadLetter(notification: Notification, reason: string): Promise<void> {
    this.logger.warn(
      `Moving notification ${notification.id} to dead letter queue. Reason: ${reason}`,
    );

    try {
      await this.prisma.$transaction([
        // Dead Letter Queue에 추가
        this.prisma.deadLetterNotification.create({
          data: {
            originalId: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            data: notification.data,
            deliveryChannel: notification.deliveryChannel,
            failureReason: reason,
            retryCount: notification.retryCount,
          },
        }),
        // 원본 알림 삭제
        this.prisma.notification.delete({
          where: { id: notification.id },
        }),
      ]);

      this.logger.log(`Notification ${notification.id} moved to dead letter queue`);
    } catch (error) {
      this.logger.error(`Failed to move notification ${notification.id} to dead letter: ${error.message}`);
      throw error;
    }
  }

  /**
   * Dead Letter Queue에서 알림 목록 조회
   */
  async findAll(options?: {
    userId?: string;
    type?: NotificationType;
    page?: number;
    limit?: number;
  }): Promise<{
    items: DeadLetterNotification[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { userId, type, page = 1, limit = 20 } = options || {};
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;

    const [items, total] = await Promise.all([
      this.prisma.deadLetterNotification.findMany({
        where,
        orderBy: { movedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.deadLetterNotification.count({ where }),
    ]);

    return {
      items: items as DeadLetterNotification[],
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Dead Letter Queue 통계 조회
   */
  async getStats(): Promise<DeadLetterStats> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [total, lastDay, lastWeek, byType] = await Promise.all([
      this.prisma.deadLetterNotification.count(),
      this.prisma.deadLetterNotification.count({
        where: { movedAt: { gte: oneDayAgo } },
      }),
      this.prisma.deadLetterNotification.count({
        where: { movedAt: { gte: oneWeekAgo } },
      }),
      this.prisma.deadLetterNotification.groupBy({
        by: ['type'],
        _count: { type: true },
      }),
    ]);

    const typeStats: Record<string, number> = {};
    for (const item of byType) {
      typeStats[item.type] = item._count.type;
    }

    // Get failure reasons
    const reasonGroups = await this.prisma.deadLetterNotification.groupBy({
      by: ['failureReason'],
      _count: { failureReason: true },
      orderBy: { _count: { failureReason: 'desc' } },
      take: 10,
    });

    const reasonStats: Record<string, number> = {};
    for (const item of reasonGroups) {
      reasonStats[item.failureReason] = item._count.failureReason;
    }

    return {
      total,
      byType: typeStats,
      byReason: reasonStats,
      lastDay,
      lastWeek,
    };
  }

  /**
   * Dead Letter Queue에서 알림 재시도
   * 관리자가 수동으로 재시도할 때 사용
   */
  async retry(deadLetterId: number): Promise<Notification> {
    const deadLetter = await this.prisma.deadLetterNotification.findUnique({
      where: { id: deadLetterId },
    });

    if (!deadLetter) {
      throw new Error(`Dead letter notification ${deadLetterId} not found`);
    }

    // 새 알림 생성 후 Dead Letter에서 삭제
    const [notification] = await this.prisma.$transaction([
      this.prisma.notification.create({
        data: {
          userId: deadLetter.userId,
          type: deadLetter.type,
          title: deadLetter.title,
          message: deadLetter.message,
          data: deadLetter.data,
          deliveryChannel: deadLetter.deliveryChannel,
          retryCount: 0,
          maxRetries: 3,
        },
      }),
      this.prisma.deadLetterNotification.delete({
        where: { id: deadLetterId },
      }),
    ]);

    this.logger.log(`Dead letter ${deadLetterId} restored as notification ${notification.id}`);

    return notification;
  }

  /**
   * Dead Letter Queue 정리 (오래된 항목 삭제)
   */
  async cleanup(retentionDays: number = 30): Promise<number> {
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    const result = await this.prisma.deadLetterNotification.deleteMany({
      where: {
        movedAt: { lt: threshold },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old dead letter notifications`);
    return result.count;
  }
}
