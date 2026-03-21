import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { SagaStatus } from '@prisma/client';
import { SAGA_CONFIG } from '../../common/constants/nats.constants';

@Injectable()
export class SagaSchedulerService {
  private readonly logger = new Logger(SagaSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

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
