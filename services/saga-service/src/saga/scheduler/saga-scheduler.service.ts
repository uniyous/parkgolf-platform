import { Inject, Injectable, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { PrismaService } from '../../../prisma/prisma.service';
import { SagaStatus } from '@prisma/client';
import { SAGA_CONFIG, NATS_TIMEOUTS } from '../../common/constants/nats.constants';
import { SagaEngineService } from '../engine/saga-engine.service';

const SLOT_RESERVED_TIMEOUT_MINUTES = 5;

interface ExpiredBooking {
  id: number;
  bookingNumber: string;
  gameTimeSlotId: number | null;
  playerCount: number;
  userId: number | null;
  clubId: number | null;
  paymentMethod: string | null;
}

@Injectable()
export class SagaSchedulerService {
  private readonly logger = new Logger(SagaSchedulerService.name);
  private isExpiringSlotReserved = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sagaEngine: SagaEngineService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
  ) {}

  /**
   * 타임아웃된 Saga 정리 (매분 실행)
   * STARTED 또는 STEP_EXECUTING 상태에서 5분 이상 경과한 Saga를 FAILED 처리
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async cleanupTimedOutSagas() {
    const timeoutThreshold = new Date(Date.now() - SAGA_CONFIG.SAGA_TIMEOUT_MS);

    try {
      const timedOutSagas = await this.prisma.sagaExecution.findMany({
        where: {
          status: { in: [SagaStatus.STARTED, SagaStatus.STEP_EXECUTING, SagaStatus.STEP_COMPLETED] },
          startedAt: { lt: timeoutThreshold },
        },
        select: { id: true, sagaType: true, correlationId: true },
      });

      if (timedOutSagas.length === 0) return;

      this.logger.warn(`[SagaScheduler] Found ${timedOutSagas.length} timed-out sagas`);

      for (const saga of timedOutSagas) {
        await this.prisma.sagaExecution.update({
          where: { id: saga.id },
          data: {
            status: SagaStatus.FAILED,
            failReason: `Saga timeout after ${SAGA_CONFIG.SAGA_TIMEOUT_MS / 1000}s`,
            failedAt: new Date(),
          },
        });

        this.logger.log(`[SagaScheduler] Saga ${saga.id} (${saga.sagaType}) marked as FAILED due to timeout`);
      }
    } catch (error) {
      this.logger.error(`[SagaScheduler] Failed to cleanup timed-out sagas: ${error.message}`);
    }
  }

  /**
   * 결제 미완료 SLOT_RESERVED 예약 자동 만료 (매분 실행)
   * booking-service에서 만료 후보를 조회하여 각 건에 PAYMENT_TIMEOUT Saga 트리거.
   * job-service 2차 방어보다 먼저 동작 (1분 vs 5분 주기) → 즉시성 향상.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async expireSlotReservedBookings() {
    if (this.isExpiringSlotReserved) return;
    this.isExpiringSlotReserved = true;

    try {
      const response = await firstValueFrom(
        this.bookingClient
          .send<{ success: boolean; data: ExpiredBooking[] }>(
            'booking.findExpiredSlotReserved',
            { timeoutMinutes: SLOT_RESERVED_TIMEOUT_MINUTES },
          )
          .pipe(
            timeout(NATS_TIMEOUTS.DEFAULT),
            catchError((err) => {
              throw new Error(`Failed to query expired SLOT_RESERVED: ${err.message}`);
            }),
          ),
      );

      const expired = (response as { data?: ExpiredBooking[] })?.data ?? [];
      if (expired.length === 0) return;

      this.logger.warn(
        `[SagaScheduler] Found ${expired.length} expired SLOT_RESERVED bookings (>${SLOT_RESERVED_TIMEOUT_MINUTES}min)`,
      );

      for (const booking of expired) {
        try {
          await this.sagaEngine.startSaga(
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
          this.logger.log(
            `[SagaScheduler] PAYMENT_TIMEOUT triggered for booking ${booking.id} (paymentMethod=${booking.paymentMethod})`,
          );
        } catch (err) {
          this.logger.error(
            `[SagaScheduler] Failed to trigger PAYMENT_TIMEOUT for booking ${booking.id}: ${err instanceof Error ? err.message : 'unknown'}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `[SagaScheduler] expireSlotReservedBookings failed: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    } finally {
      this.isExpiringSlotReserved = false;
    }
  }

  /**
   * 완료된 오래된 Saga 정리 (매일 자정)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupOldSagas() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - SAGA_CONFIG.RETENTION_DAYS);

    try {
      const result = await this.prisma.sagaExecution.deleteMany({
        where: {
          status: { in: [SagaStatus.COMPLETED, SagaStatus.FAILED] },
          startedAt: { lt: cutoffDate },
        },
      });

      if (result.count > 0) {
        this.logger.log(`[SagaScheduler] Cleaned up ${result.count} old saga executions`);
      }
    } catch (error) {
      this.logger.error(`[SagaScheduler] Failed to cleanup old sagas: ${error.message}`);
    }
  }
}
