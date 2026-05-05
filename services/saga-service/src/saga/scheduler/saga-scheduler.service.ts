import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { SagaStatus } from '@prisma/client';
import { SAGA_CONFIG } from '../../common/constants/nats.constants';

/**
 * Saga 안전망 스케줄러
 *
 * pg-boss 도입 후 대부분의 cron이 제거되었고, 본 서비스는 두 가지 안전망 역할만 수행:
 *   1. 오래된 saga 정리 (매일 자정, retention)
 *   2. pg-boss 자체 장애 시 누락 saga 발견 (선택적, 매 30분)
 *
 * timeout 발생 시 보상 트랜잭션 실행은 SagaPgBossWorkerService가 담당.
 * payment timeout 트리거도 pg-boss task로 이전됨.
 */
@Injectable()
export class SagaSchedulerService {
  private readonly logger = new Logger(SagaSchedulerService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 오래된 Saga 정리 (매일 자정, RETENTION_DAYS 경과)
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
      this.logger.error(
        `[SagaScheduler] Failed to cleanup old sagas: ${error instanceof Error ? error.message : 'unknown'}`,
      );
    }
  }
}
