import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { firstValueFrom, timeout } from 'rxjs';

/**
 * Outbox 이벤트 프로세서
 * 결제 이벤트를 다른 서비스로 안정적으로 전달
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private readonly maxRetries = 5;
  private readonly batchSize = 10;
  private readonly sendTimeoutMs = 10_000;
  private isProcessing = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // 서비스 시작 시 NATS 클라이언트 연결
    await this.bookingClient.connect();
    await this.notificationClient.connect();
    this.logger.log('Outbox processor initialized');
  }

  /**
   * 5초마다 미처리 이벤트 처리
   */
  @Cron(CronExpression.EVERY_5_SECONDS)
  async processOutboxEvents() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    try {
      // 처리 대기중인 이벤트 조회
      const events = await this.prisma.paymentOutboxEvent.findMany({
        where: {
          status: OutboxStatus.PENDING,
          retryCount: { lt: this.maxRetries },
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
      });

      if (events.length === 0) {
        return;
      }

      this.logger.log(`Processing ${events.length} outbox events`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error('Outbox processing error', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 개별 이벤트 처리
   */
  private async processEvent(event: {
    id: number;
    eventType: string;
    payload: unknown;
    retryCount: number;
  }) {
    try {
      // 이벤트 타입에 따라 적절한 서비스로 전송
      await this.sendEvent(event.eventType, event.payload as Record<string, unknown>);

      // 성공 시 상태 업데이트
      await this.prisma.paymentOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: OutboxStatus.SENT,
          processedAt: new Date(),
        },
      });

      this.logger.log(`Event processed: ${event.eventType} (id: ${event.id})`);
    } catch (error) {
      // 실패 시 재시도 카운트 증가
      const newRetryCount = event.retryCount + 1;
      const newStatus =
        newRetryCount >= this.maxRetries
          ? OutboxStatus.FAILED
          : OutboxStatus.PENDING;

      await this.prisma.paymentOutboxEvent.update({
        where: { id: event.id },
        data: {
          status: newStatus,
          retryCount: newRetryCount,
          lastError: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      this.logger.warn(
        `Event failed: ${event.eventType} (id: ${event.id}, retry: ${newRetryCount})`,
      );
    }
  }

  /**
   * 이벤트 타입에 따른 NATS 메시지 전송
   */
  private async sendEvent(eventType: string, payload: Record<string, unknown>) {
    const pattern = this.getPattern(eventType);
    const client = this.getClient(eventType);

    await firstValueFrom(
      client.send(pattern, payload).pipe(timeout(this.sendTimeoutMs)),
    );
  }

  /**
   * 이벤트 타입 → NATS 패턴 매핑
   */
  private getPattern(eventType: string): string {
    const patternMap: Record<string, string> = {
      'payment.confirmed': 'booking.paymentConfirmed',
      'payment.canceled': 'booking.paymentCanceled',
      'payment.deposited': 'booking.paymentDeposited',
    };
    return patternMap[eventType] || eventType;
  }

  /**
   * 이벤트 타입 → NATS 클라이언트 매핑
   */
  private getClient(eventType: string): ClientProxy {
    // 결제 관련 이벤트는 booking-service로
    if (eventType.startsWith('payment.')) {
      return this.bookingClient;
    }
    // 알림 관련 이벤트는 notification-service로
    if (eventType.startsWith('notification.')) {
      return this.notificationClient;
    }
    return this.bookingClient;
  }

  /**
   * 실패한 이벤트 재시도 (수동)
   */
  async retryFailedEvents() {
    const result = await this.prisma.paymentOutboxEvent.updateMany({
      where: { status: OutboxStatus.FAILED },
      data: {
        status: OutboxStatus.PENDING,
        retryCount: 0,
        lastError: null,
      },
    });

    this.logger.log(`Reset ${result.count} failed events for retry`);
    return result.count;
  }

  /**
   * 이벤트 통계 조회
   */
  async getEventStats() {
    const [pending, sent, failed] = await Promise.all([
      this.prisma.paymentOutboxEvent.count({
        where: { status: OutboxStatus.PENDING },
      }),
      this.prisma.paymentOutboxEvent.count({
        where: { status: OutboxStatus.SENT },
      }),
      this.prisma.paymentOutboxEvent.count({
        where: { status: OutboxStatus.FAILED },
      }),
    ]);

    return { pending, sent, failed, total: pending + sent + failed };
  }
}
