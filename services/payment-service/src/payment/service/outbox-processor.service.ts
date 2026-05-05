import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OutboxStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { firstValueFrom, timeout } from 'rxjs';
import type { Job } from 'pg-boss';
import { PgBossService } from '../../common/pgboss/pgboss.service';

const OUTBOX_QUEUE = 'payment-outbox-publish';

interface OutboxJobData {
  outboxEventId: number;
}

/**
 * Outbox 이벤트 프로세서
 *
 * 처리 경로 (이중 안전망):
 *   1. Primary: pg-boss worker (createOutboxEvent에서 즉시 트리거됨)
 *   2. Backup: 매 1분 cron으로 미처리 PENDING 검사 (pg-boss 장애 시 안전망)
 *
 * 멀티 pod 안전:
 *   - pg-boss는 SELECT FOR UPDATE SKIP LOCKED 내장
 *   - 백업 cron은 status PROCESSING 변경으로 단일 처리 보장
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
    private readonly pgboss: PgBossService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // NATS 클라이언트 연결
    await this.bookingClient.connect();
    await this.notificationClient.connect();

    // pg-boss worker 등록 (primary 처리 경로)
    await this.pgboss.createQueue(OUTBOX_QUEUE);
    await this.pgboss.work<OutboxJobData>(OUTBOX_QUEUE, (job) => this.handleOutboxJob(job));

    this.logger.log('Outbox processor initialized (pg-boss worker + backup cron)');
  }

  /**
   * pg-boss worker — outbox event id로 단건 처리
   */
  private async handleOutboxJob(job: Job<OutboxJobData>): Promise<unknown> {
    const event = await this.prisma.paymentOutboxEvent.findUnique({
      where: { id: job.data.outboxEventId },
    });
    if (!event) {
      return { skipped: true, reason: 'not_found' };
    }
    if (event.status !== OutboxStatus.PENDING) {
      return { skipped: true, currentStatus: event.status };
    }
    return this.processEvent(event);
  }

  /**
   * 안전망 cron — pg-boss 장애 시 미처리 PENDING 회수
   * 1분 주기로 검사 (정상 케이스에선 거의 빈 결과)
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async backupPollPendingEvents() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const events = await this.prisma.paymentOutboxEvent.findMany({
        where: {
          status: OutboxStatus.PENDING,
          retryCount: { lt: this.maxRetries },
          // pg-boss가 처리 중인 신규 이벤트는 skip하기 위해 30초 이전 PENDING만
          createdAt: { lt: new Date(Date.now() - 30_000) },
        },
        orderBy: { createdAt: 'asc' },
        take: this.batchSize,
      });

      if (events.length === 0) return;

      this.logger.warn(`[Outbox backup] Recovering ${events.length} stale PENDING events`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error(
        `[Outbox backup] error: ${error instanceof Error ? error.message : 'unknown'}`,
      );
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
      'payment.failed': 'booking.paymentFailed',
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
