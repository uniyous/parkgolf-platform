import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type PgBoss from 'pg-boss';
import { PgBossService } from '../../common/pgboss/pgboss.service';
import { SagaEngine } from '@uniyous/saga-engine';

const SAGA_TIMEOUT_RECOVERY_QUEUE = 'saga-timeout-recovery';

interface SagaTimeoutPayload {
  sagaExecutionId: number;
}

/**
 * pg-boss 기반 saga 백그라운드 worker (manager — UNI-127 ② chunk B).
 *
 * 처리 큐:
 *   - saga-timeout-recovery: saga가 15분 이상 active일 때 보상 자동 실행(제네릭 안전망)
 *
 * ※ 마켓의 payment-timeout은 비대상 — 매니저는 현장 수납(데스크·키오스크)이라 비동기 결제 대기 없음.
 */
@Injectable()
export class SagaPgBossWorkerService implements OnModuleInit {
  private readonly logger = new Logger(SagaPgBossWorkerService.name);

  constructor(
    private readonly pgboss: PgBossService,
    private readonly sagaEngine: SagaEngine,
  ) {}

  async onModuleInit() {
    await this.pgboss.createQueue(SAGA_TIMEOUT_RECOVERY_QUEUE);

    await this.pgboss.work<SagaTimeoutPayload>(
      SAGA_TIMEOUT_RECOVERY_QUEUE,
      (job) => this.handleSagaTimeoutRecovery(job),
    );

    this.logger.log('SagaPgBossWorker registered: saga-timeout-recovery');
  }

  /**
   * saga timeout recovery — saga-engine.startSaga에서 등록한 task 처리
   */
  private async handleSagaTimeoutRecovery(job: PgBoss.Job<SagaTimeoutPayload>) {
    const { sagaExecutionId } = job.data;
    this.logger.warn(`[pgboss] saga-timeout-recovery received: sagaExecutionId=${sagaExecutionId}`);
    return this.sagaEngine.recoverTimedOutSaga(sagaExecutionId);
  }
}
