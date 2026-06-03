import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import type { Job } from 'pg-boss';
import { NATS_TIMEOUTS } from '../../common/constants';
import { PgBossService } from '../../common/pgboss/pgboss.service';

// Outbox 처리 설정
const BATCH_SIZE = 10;               // 한 번에 처리할 이벤트 수
const MAX_RETRY_COUNT = 5;           // 최대 재시도 횟수
const OUTBOX_QUEUE = 'booking-outbox-publish';
const BACKUP_POLL_QUEUE = 'booking-outbox-backup-poll';

interface OutboxJobData {
  outboxEventId: number;
}

/**
 * Outbox 이벤트 프로세서
 *
 * 처리 경로 (이중 안전망):
 *   1. Primary: pg-boss worker (createOutboxEvent 후 triggerImmediate에서 즉시 트리거)
 *   2. Backup: pg-boss recurring(매분) — pg-boss send 실패 시 stale PENDING 회수
 *
 * 멀티 pod 안전:
 *   - 두 worker 모두 SELECT FOR UPDATE SKIP LOCKED 내장
 *   - backup poll의 raw query도 FOR UPDATE SKIP LOCKED 사용
 */
@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pgboss: PgBossService,
    @Inject('CLUB_SERVICE') private readonly courseServiceClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
    @Inject('PAYMENT_SERVICE') private readonly paymentServiceClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // Primary: 단건 outbox 트리거 worker
    await this.pgboss.createQueue(OUTBOX_QUEUE);
    await this.pgboss.work<OutboxJobData>(OUTBOX_QUEUE, (job) => this.handleOutboxJob(job));

    // Backup: 매분 PENDING 회수 (pg-boss recurring)
    await this.pgboss.createQueue(BACKUP_POLL_QUEUE);
    await this.pgboss.schedule(BACKUP_POLL_QUEUE, '* * * * *');
    await this.pgboss.work(BACKUP_POLL_QUEUE, () => this.backupPollPendingEvents());

    this.logger.log('OutboxProcessor initialized (pg-boss worker + recurring backup poll)');
  }

  /**
   * pg-boss worker — outboxEventId로 단건 조회 후 발행
   */
  private async handleOutboxJob(job: Job<OutboxJobData>): Promise<unknown> {
    const event = await this.prisma.bookingOutboxEvent.findUnique({
      where: { id: job.data.outboxEventId },
    });
    if (!event) return { skipped: true, reason: 'not_found' };
    if (event.status !== OutboxStatus.PENDING) return { skipped: true, currentStatus: event.status };

    return this.processEvent({
      id: event.id,
      event_type: event.eventType,
      payload: event.payload,
      retry_count: event.retryCount,
    });
  }

  /**
   * 새 OutboxEvent 생성 직후 즉시 처리 트리거
   * - id 있으면 pg-boss send로 단건 worker 트리거
   * - id 없으면 backup poll 즉시 실행 (그룹 작업 등에서 다건 처리)
   */
  async triggerImmediate(outboxEventId?: number): Promise<void> {
    if (outboxEventId) {
      try {
        await this.pgboss.send(
          OUTBOX_QUEUE,
          { outboxEventId },
          { singletonKey: `outbox-${outboxEventId}`, retryLimit: MAX_RETRY_COUNT, retryBackoff: true },
        );
        return;
      } catch (err) {
        this.logger.warn(
          `[Outbox] pg-boss trigger failed for event ${outboxEventId}: ${err instanceof Error ? err.message : 'unknown'}. Backup poll will pick up.`,
        );
      }
    }
    // id 없거나 pg-boss 실패 → backup poll 즉시 실행
    await this.backupPollPendingEvents();
  }

  /**
   * 안전망 — pg-boss recurring(매분)으로 미처리 PENDING 회수
   * pg-boss work는 동시 실행을 단일 처리로 보장 (SELECT FOR UPDATE SKIP LOCKED)
   */
  async backupPollPendingEvents(): Promise<void> {
    try {
      await this.processOutboxEvents();
    } catch (err) {
      this.logger.error(
        `[Outbox backup] error: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
  }

  /**
   * Outbox 이벤트 처리 메인 루프
   */
  async processOutboxEvents(): Promise<void> {
    try {
      // PENDING 상태의 이벤트 조회 (FOR UPDATE SKIP LOCKED로 동시성 제어)
      const events = await this.prisma.$queryRaw<Array<{
        id: number;
        event_type: string;
        payload: any;
        retry_count: number;
      }>>`
        SELECT id, event_type, payload, retry_count
        FROM booking_outbox_events
        WHERE status = 'PENDING'
          AND (retry_count < ${MAX_RETRY_COUNT})
        ORDER BY created_at ASC
        LIMIT ${BATCH_SIZE}
        FOR UPDATE SKIP LOCKED
      `;

      if (events.length === 0) {
        return;
      }

      this.logger.debug(`Processing ${events.length} outbox events`);

      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error(`Outbox processing error: ${error.message}`);
    }
  }

  /**
   * 개별 이벤트 처리
   */
  private async processEvent(event: {
    id: number;
    event_type: string;
    payload: any;
    retry_count: number;
  }): Promise<void> {
    const bookingId = event.payload?.bookingId || 'N/A';
    const startTime = Date.now();
    this.logger.log(`[Outbox] Processing event ${event.id} (${event.event_type}) for bookingId=${bookingId}, retry=${event.retry_count}`);

    try {
      // PROCESSING 상태로 변경
      await this.prisma.bookingOutboxEvent.update({
        where: { id: event.id },
        data: { status: OutboxStatus.PROCESSING },
      });

      const client = this.getClientForEventType(event.event_type);
      const isRequestReply = this.isRequestReplyEvent(event.event_type);

      if (isRequestReply) {
        // Request-Reply 패턴 (응답 대기)
        this.logger.log(`[Outbox] Sending ${event.event_type} (Request-Reply)...`);
        const response = await firstValueFrom(
          client.send(event.event_type, event.payload).pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              this.logger.error(`[Outbox] NATS send failed for ${event.event_type}: ${err.message}`);
              return of({ success: false, error: err.message });
            })
          )
        );

        const elapsed = Date.now() - startTime;
        if (response?.success) {
          await this.markEventAsSent(event.id);
          this.logger.log(`[Outbox] Event ${event.id} (${event.event_type}) SUCCESS in ${elapsed}ms - bookingId=${bookingId}`);
        } else {
          this.logger.warn(`[Outbox] Event ${event.id} (${event.event_type}) FAILED in ${elapsed}ms: ${response?.error} - bookingId=${bookingId}`);
          await this.handleEventFailure(event, response?.error || 'Unknown error');
        }
      } else {
        // Event 패턴 (Fire-and-forget)
        client.emit(event.event_type, event.payload);
        await this.markEventAsSent(event.id);
        const elapsed = Date.now() - startTime;
        this.logger.log(`[Outbox] Event ${event.id} (${event.event_type}) emitted in ${elapsed}ms - bookingId=${bookingId}`);
      }
    } catch (error) {
      const elapsed = Date.now() - startTime;
      this.logger.error(`[Outbox] Event ${event.id} ERROR in ${elapsed}ms: ${error.message} - bookingId=${bookingId}`);
      await this.handleEventFailure(event, error.message);
    }
  }

  /**
   * 이벤트 타입에 따른 NATS 클라이언트 선택
   */
  private getClientForEventType(eventType: string): ClientProxy {
    if (eventType.startsWith('slot.') || eventType.startsWith('gameTimeSlots.')) {
      return this.courseServiceClient;
    }
    if (eventType.startsWith('payment.')) {
      return this.paymentServiceClient;
    }
    if (eventType.startsWith('booking.') || eventType.startsWith('notification.')) {
      return this.notificationClient;
    }
    return this.courseServiceClient;
  }

  /**
   * Request-Reply 패턴 여부 확인
   */
  private isRequestReplyEvent(eventType: string): boolean {
    const requestReplyEvents = [
      'slot.reserve',
      'slot.release',
      'gameTimeSlots.reserve',
      'gameTimeSlots.release',
      'payment.cancelByBookingId',
    ];
    return requestReplyEvents.includes(eventType);
  }

  /**
   * 이벤트 발행 성공 처리
   */
  private async markEventAsSent(eventId: number): Promise<void> {
    await this.prisma.bookingOutboxEvent.update({
      where: { id: eventId },
      data: {
        status: OutboxStatus.SENT,
        processedAt: new Date(),
      },
    });
  }

  /**
   * 이벤트 발행 실패 처리
   */
  private async handleEventFailure(
    event: { id: number; retry_count: number; event_type: string },
    errorMessage: string
  ): Promise<void> {
    const newRetryCount = event.retry_count + 1;
    const isFinalFailure = newRetryCount >= MAX_RETRY_COUNT;

    await this.prisma.bookingOutboxEvent.update({
      where: { id: event.id },
      data: {
        status: isFinalFailure ? OutboxStatus.FAILED : OutboxStatus.PENDING,
        retryCount: newRetryCount,
        lastError: errorMessage,
      },
    });

    if (isFinalFailure) {
      this.logger.error(
        `Outbox event ${event.id} (${event.event_type}) failed permanently after ${MAX_RETRY_COUNT} retries: ${errorMessage}`
      );
    } else {
      this.logger.warn(
        `Outbox event ${event.id} (${event.event_type}) failed, retry ${newRetryCount}/${MAX_RETRY_COUNT}: ${errorMessage}`
      );
    }
  }

}
