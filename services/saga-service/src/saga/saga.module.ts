import { Module } from '@nestjs/common';
import { SagaEngineService } from './engine/saga-engine.service';
import { SagaRegistry } from './engine/saga-registry';
import { StepExecutorService } from './engine/step-executor.service';
import { SagaNatsController } from './controller/saga-nats.controller';
import { SagaPgBossWorkerService } from './worker/saga-pgboss-worker.service';

@Module({
  controllers: [SagaNatsController],
  providers: [
    SagaEngineService,
    SagaRegistry,
    StepExecutorService,
    SagaPgBossWorkerService,
  ],
  exports: [SagaEngineService],
})
export class SagaModule {}
