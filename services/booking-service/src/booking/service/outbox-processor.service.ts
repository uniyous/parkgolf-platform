import { Injectable, Logger, Inject, OnModuleInit, OnModuleDestroy, forwardRef } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { PrismaService } from '../../../prisma/prisma.service';
import { OutboxStatus } from '@prisma/client';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { NATS_TIMEOUTS } from '../../common/constants';
import { SagaHandlerService } from './saga-handler.service';

// Outbox 처리 설정
const POLL_INTERVAL_MS = 3000;       // 3초 안전망 폴링 (GKE 복수 Pod 환경 대비)
const BATCH_SIZE = 10;               // 한 번에 처리할 이벤트 수
const MAX_RETRY_COUNT = 5;           // 최대 재시도 횟수
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
    @Inject('PAYMENT_SERVICE') private readonly paymentServiceClient: ClientProxy,
    @Inject(forwardRef(() => SagaHandlerService)) private readonly sagaHandler: SagaHandlerService,
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
   * 새 OutboxEvent 생성 직후 즉시 처리 트리거
   * - 트랜잭션 커밋 후 호출하여 폴링 대기 없이 즉시 이벤트 발행
   * - 이미 처리 중이면 안전망 폴링에서 처리됨
   */
  async triggerImmediate(): Promise<void> {
    if (!this.isProcessing) {
      this.logger.debug('[Outbox] Immediate trigger activated');
      await this.processOutboxEvents();
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
    const bookingId = event.payload?.bookingId || 'N/A';
    const startTime = Date.now();
    this.logger.log(`[Outbox] Processing event ${event.id} (${event.event_type}) for bookingId=${bookingId}, retry=${event.retry_count}`);

    try {
      // PROCESSING 상태로 변경
      await this.prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: OutboxStatus.PROCESSING },
      });
      this.logger.log(`[Outbox] Event ${event.id} marked as PROCESSING`);

      // 이벤트 타입에 따라 적절한 클라이언트로 발행
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

          // Saga 응답 직접 처리 (course-service fire-and-forget emit 대체)
          await this.handleSagaSuccess(event.event_type, event.payload);
        } else {
          this.logger.warn(`[Outbox] Event ${event.id} (${event.event_type}) FAILED in ${elapsed}ms: ${response?.error} - bookingId=${bookingId}`);

          // Saga 실패 직접 처리 (비즈니스 로직 실패 시 재시도 불필요)
          const sagaHandled = await this.handleSagaFailure(event.event_type, event.payload, response?.error);
          if (sagaHandled) {
            await this.markEventAsSent(event.id);
          } else {
            await this.handleEventFailure(event, response?.error || 'Unknown error');
          }
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
      'payment.cancelByBookingId',
    ];
    return requestReplyEvents.includes(eventType);
  }

  /**
   * Saga 성공 응답 직접 처리
   * course-service의 fire-and-forget emit을 대체하여 동기적으로 처리
   */
  private async handleSagaSuccess(eventType: string, payload: Record<string, unknown>): Promise<void> {
    try {
      if (eventType === 'slot.reserve') {
        await this.sagaHandler.handleSlotReserved({
          bookingId: payload.bookingId as number,
          gameTimeSlotId: payload.gameTimeSlotId as number,
          playerCount: payload.playerCount as number,
          reservedAt: new Date().toISOString(),
        });
        this.logger.log(`[Outbox] Saga handleSlotReserved completed for bookingId=${payload.bookingId}`);
      } else if (eventType === 'slot.release') {
        await this.sagaHandler.handleBookingCancelled({
          bookingId: payload.bookingId as number,
          gameTimeSlotId: payload.gameTimeSlotId as number,
          playerCount: payload.playerCount as number,
        });
        this.logger.log(`[Outbox] Saga handleBookingCancelled completed for bookingId=${payload.bookingId}`);
      }
    } catch (error) {
      this.logger.error(`[Outbox] Saga success handler failed for ${eventType}: ${error.message}`);
    }
  }

  /**
   * Saga 실패 응답 직접 처리
   * @returns true: 비즈니스 로직 실패 (재시도 불필요, SENT 처리)
   *          false: 재시도 필요
   */
  private async handleSagaFailure(
    eventType: string,
    payload: Record<string, unknown>,
    error?: string,
  ): Promise<boolean> {
    try {
      if (eventType === 'slot.reserve') {
        await this.sagaHandler.handleSlotReserveFailed({
          bookingId: payload.bookingId as number,
          gameTimeSlotId: payload.gameTimeSlotId as number,
          reason: error || 'Slot reservation failed',
        });
        this.logger.log(`[Outbox] Saga handleSlotReserveFailed completed for bookingId=${payload.bookingId}`);
        return true; // 비즈니스 로직 실패 → 재시도 불필요
      }
    } catch (err) {
      this.logger.error(`[Outbox] Saga failure handler failed for ${eventType}: ${err.message}`);
    }
    // slot.release 실패 등은 재시도 필요 (슬롯 해제 일관성 보장)
    return false;
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
