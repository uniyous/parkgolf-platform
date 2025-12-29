import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

// Outbox 처리 설정
const POLL_INTERVAL_MS = 1000;       // 1초마다 폴링
const BATCH_SIZE = 10;               // 한 번에 처리할 이벤트 수
const MAX_RETRY_COUNT = 5;           // 최대 재시도 횟수
const NATS_TIMEOUT_MS = 5000;        // NATS 호출 타임아웃
const PROCESSING_LOCK_MS = 30000;    // 처리 중 락 시간 (30초)

@Injectable()
export class OutboxProcessorService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private isProcessing = false;
  private intervalHandle: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject('COURSE_SERVICE') private readonly courseServiceClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  onModuleInit() {
    this.logger.log('OutboxProcessor starting...');
    this.startPolling();
  }

  onModuleDestroy() {
    this.logger.log('OutboxProcessor stopping...');
    this.stopPolling();
  }

  private startPolling() {
    this.intervalHandle = setInterval(async () => {
      if (!this.isProcessing) {
        await this.processOutboxEvents();
      }
    }, POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Outbox 이벤트 처리 메인 루프
   */
  async processOutboxEvents(): Promise<void> {
    this.isProcessing = true;

    try {
      // 1. PENDING 상태의 이벤트 조회 (FOR UPDATE SKIP LOCKED로 동시성 제어)
      const events = await this.prisma.$queryRaw<Array<{
        id: number;
        event_type: string;
        payload: any;
        retry_count: number;
      }>>`
        SELECT id, event_type, payload, retry_count
        FROM outbox_events
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

      // 2. 각 이벤트 처리
      for (const event of events) {
        await this.processEvent(event);
      }
    } catch (error) {
      this.logger.error(`Outbox processing error: ${error.message}`);
    } finally {
      this.isProcessing = false;
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
    try {
      // PROCESSING 상태로 변경
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: OutboxStatus.PROCESSING },
      });

      // 이벤트 타입에 따라 적절한 클라이언트로 발행
      const client = this.getClientForEventType(event.event_type);
      const isRequestReply = this.isRequestReplyEvent(event.event_type);

      if (isRequestReply) {
        // Request-Reply 패턴 (응답 대기)
        const response = await firstValueFrom(
          client.send(event.event_type, event.payload).pipe(
            timeout(NATS_TIMEOUT_MS),
            catchError((err) => {
              this.logger.error(`NATS send failed for ${event.event_type}: ${err.message}`);
              return of({ success: false, error: err.message });
            })
          )
        );

        if (response?.success) {
          await this.markEventAsSent(event.id);
          this.logger.log(`Outbox event ${event.id} (${event.event_type}) sent successfully`);
        } else {
          await this.handleEventFailure(event, response?.error || 'Unknown error');
        }
      } else {
        // Event 패턴 (Fire-and-forget)
        client.emit(event.event_type, event.payload);
        await this.markEventAsSent(event.id);
        this.logger.log(`Outbox event ${event.id} (${event.event_type}) emitted successfully`);
      }
    } catch (error) {
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
    if (eventType.startsWith('booking.') || eventType.startsWith('notification.')) {
      return this.notificationClient;
    }
    // 기본값은 course-service
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
    ];
    return requestReplyEvents.includes(eventType);
  }

  /**
   * 이벤트 발행 성공 처리
   */
  private async markEventAsSent(eventId: number): Promise<void> {
    await this.prisma.outboxEvent.update({
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

    await this.prisma.outboxEvent.update({
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
      // TODO: 알림 발송 또는 Dead Letter Queue로 이동
    } else {
      this.logger.warn(
        `Outbox event ${event.id} (${event.event_type}) failed, retry ${newRetryCount}/${MAX_RETRY_COUNT}: ${errorMessage}`
      );
    }
  }

  /**
   * 만료된 SENT 이벤트 정리 (선택적)
   */
  async cleanupOldEvents(retentionDays: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.outboxEvent.deleteMany({
      where: {
        status: OutboxStatus.SENT,
        processedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Cleaned up ${result.count} old outbox events`);
    return result.count;
  }
}
