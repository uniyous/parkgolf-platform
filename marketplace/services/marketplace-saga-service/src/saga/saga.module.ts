import { Module, Logger } from '@nestjs/common';
import { SagaEngine, SagaRegistry } from '@uniyous/saga-engine';
import { StepExecutorService } from './adapters/step-executor.service';
import { DrizzleSagaStore } from './adapters/drizzle-saga-store';
import { PgBossJobScheduler } from './adapters/pgboss-job-scheduler';
import { SagaNatsController } from './controller/saga-nats.controller';
import { SagaPgBossWorkerService } from './worker/saga-pgboss-worker.service';
import {
  CreateBookingSaga,
  CancelBookingSaga,
  AdminRefundSaga,
  PaymentConfirmedSaga,
  PaymentTimeoutSaga,
  PaymentFailedSaga,
} from './definitions';

/**
 * 마켓 saga 모듈 — 공유 엔진(@uniyous/saga-engine) + marketplace 어댑터/정의 (UNI-127 ②).
 * 엔진은 포트(store·executor·scheduler·registry)로만 주입되어 제품 무관.
 */
@Module({
  controllers: [SagaNatsController],
  providers: [
    DrizzleSagaStore,
    PgBossJobScheduler,
    StepExecutorService,
    SagaPgBossWorkerService,
    {
      provide: SagaEngine,
      useFactory: (
        store: DrizzleSagaStore,
        executor: StepExecutorService,
        scheduler: PgBossJobScheduler,
      ): SagaEngine => {
        const logger = new Logger('SagaEngine');
        const registry = new SagaRegistry([
          CreateBookingSaga,
          CancelBookingSaga,
          AdminRefundSaga,
          PaymentConfirmedSaga,
          PaymentTimeoutSaga,
          PaymentFailedSaga,
        ]);
        logger.log(
          `Registered ${registry.size} saga definitions: ${registry.getAll().map((d) => d.name).join(', ')}`,
        );
        return new SagaEngine({ store, executor, scheduler, registry, logger });
      },
      inject: [DrizzleSagaStore, StepExecutorService, PgBossJobScheduler],
    },
  ],
  exports: [SagaEngine],
})
export class SagaModule {}
