import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import type PgBoss from 'pg-boss';
import { PgBossService } from '../../common/pgboss/pgboss.service';
import { SagaEngineService } from '../engine/saga-engine.service';
import { NATS_TIMEOUTS } from '../../common/constants/nats.constants';

const SAGA_TIMEOUT_RECOVERY_QUEUE = 'saga-timeout-recovery';
const PAYMENT_TIMEOUT_QUEUE = 'payment-timeout';

interface SagaTimeoutPayload {
  sagaExecutionId: number;
}

interface PaymentTimeoutPayload {
  bookingId: number;
}

interface BookingDetail {
  id: number;
  bookingNumber: string;
  gameTimeSlotId: number | null;
  playerCount: number;
  userId: number | null;
  clubId: number | null;
  paymentMethod: string | null;
  status: string;
}

/**
 * pg-boss 기반 saga 백그라운드 worker
 *
 * 처리하는 큐:
 *   - saga-timeout-recovery: saga가 15분 이상 active 상태일 때 보상 자동 실행
 *   - payment-timeout: booking이 5분 이상 SLOT_RESERVED 상태일 때 PAYMENT_TIMEOUT Saga 트리거
 */
@Injectable()
export class SagaPgBossWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SagaPgBossWorkerService.name);

  constructor(
    private readonly pgboss: PgBossService,
    private readonly sagaEngine: SagaEngineService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  async onModuleInit() {
    // Queue 생성 (멱등)
    await this.pgboss.createQueue(SAGA_TIMEOUT_RECOVERY_QUEUE);
    await this.pgboss.createQueue(PAYMENT_TIMEOUT_QUEUE);

    // Worker 등록
    await this.pgboss.work<SagaTimeoutPayload>(
      SAGA_TIMEOUT_RECOVERY_QUEUE,
      (job) => this.handleSagaTimeoutRecovery(job),
    );

    await this.pgboss.work<PaymentTimeoutPayload>(
      PAYMENT_TIMEOUT_QUEUE,
      (job) => this.handlePaymentTimeout(job),
    );

    this.logger.log('SagaPgBossWorker registered: saga-timeout-recovery, payment-timeout');
  }

  /**
   * saga timeout recovery — saga-engine.startSaga에서 등록한 task 처리
   */
  private async handleSagaTimeoutRecovery(job: PgBoss.Job<SagaTimeoutPayload>) {
    const { sagaExecutionId } = job.data;
    this.logger.warn(`[pgboss] saga-timeout-recovery received: sagaExecutionId=${sagaExecutionId}`);
    return this.sagaEngine.recoverTimedOutSaga(sagaExecutionId);
  }

  /**
   * payment timeout — booking 생성 시 등록된 task 처리
   * SLOT_RESERVED인 booking에 대해 PAYMENT_TIMEOUT Saga 트리거.
   * 이미 CONFIRMED/CANCELLED/FAILED인 booking은 멱등 skip.
   */
  private async handlePaymentTimeout(job: PgBoss.Job<PaymentTimeoutPayload>) {
    const { bookingId } = job.data;
    this.logger.log(`[pgboss] payment-timeout received: bookingId=${bookingId}`);

    // booking-service에서 상태 조회 (NATS request-reply)
    let booking: BookingDetail | null = null;
    try {
      const response = await firstValueFrom(
        this.bookingClient
          .send<{ success: boolean; data: BookingDetail }>('booking.findById', { id: bookingId })
          .pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              throw new Error(`booking.findById failed: ${err.message}`);
            }),
          ),
      );
      booking = (response as { data?: BookingDetail })?.data ?? null;
    } catch (err) {
      this.logger.error(
        `[pgboss] Failed to fetch booking ${bookingId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      throw err; // pg-boss가 retry
    }

    if (!booking) {
      this.logger.warn(`[pgboss] booking ${bookingId} not found, skipping`);
      return { skipped: true, reason: 'not_found' };
    }

    // SLOT_RESERVED가 아니면 이미 처리됨 (CONFIRMED 또는 정리됨)
    if (booking.status !== 'SLOT_RESERVED') {
      this.logger.log(
        `[pgboss] booking ${bookingId} status=${booking.status}, skipping PAYMENT_TIMEOUT`,
      );
      return { skipped: true, currentStatus: booking.status };
    }

    // PAYMENT_TIMEOUT Saga 시작
    return this.sagaEngine.startSaga(
      'PAYMENT_TIMEOUT',
      {
        bookingId: booking.id,
        gameTimeSlotId: booking.gameTimeSlotId,
        playerCount: booking.playerCount,
        userId: booking.userId,
        bookingNumber: booking.bookingNumber,
        paymentMethod: booking.paymentMethod,
      },
      'SYSTEM',
    );
  }
}
