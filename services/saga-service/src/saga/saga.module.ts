import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SagaEngineService } from './engine/saga-engine.service';
import { SagaRegistry } from './engine/saga-registry';
import { StepExecutorService } from './engine/step-executor.service';
import { SagaNatsController } from './controller/saga-nats.controller';
import { SagaSchedulerService } from './scheduler/saga-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SagaNatsController],
  providers: [
    SagaEngineService,
    SagaRegistry,
    StepExecutorService,
    SagaSchedulerService,
  ],
  exports: [SagaEngineService],
})
export class SagaModule {}
