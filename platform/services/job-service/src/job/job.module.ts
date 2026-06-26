import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobSchedulerService } from './service/job-scheduler.service';
import { JobNatsController } from './controller/job-nats.controller';

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [JobNatsController],
  providers: [JobSchedulerService],
  exports: [JobSchedulerService],
})
export class JobModule {}
