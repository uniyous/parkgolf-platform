import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SagaEngineService } from './engine/saga-engine.service';
import { SagaRegistry } from './engine/saga-registry';
import { StepExecutorService } from './engine/step-executor.service';
import { SagaNatsController } from './controller/saga-nats.controller';
import { SagaSchedulerService } from './scheduler/saga-scheduler.service';
import { SagaPgBossWorkerService } from './scheduler/saga-pgboss-worker.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SagaNatsController],
  providers: [
    SagaEngineService,
    SagaRegistry,
    StepExecutorService,
    SagaSchedulerService,
    SagaPgBossWorkerService,
  ],
  exports: [SagaEngineService],
})
export class SagaModule {}
