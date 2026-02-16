import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { JobSchedulerService } from '../service/job-scheduler.service';
import { NatsResponse } from '../../common/types/response.types';

@Controller()
export class JobNatsController {
  constructor(private readonly jobSchedulerService: JobSchedulerService) {}

  /**
   * 등록된 배치 작업 목록 조회
   */
  @MessagePattern('job.list')
  async listJobs() {
    const jobs = this.jobSchedulerService.getRegisteredJobs();
    return NatsResponse.success(jobs);
  }

  /**
   * 배치 작업 수동 실행
   */
  @MessagePattern('job.run')
  async runJob(@Payload() data: { jobName: string }) {
    const result = await this.jobSchedulerService.runJob(data.jobName);
    return NatsResponse.success(result);
  }

  /**
   * 삭제 리마인더 수동 실행
   */
  @MessagePattern('job.deletion.reminder')
  async runDeletionReminder() {
    const result = await this.jobSchedulerService.runJob('deletion-reminder');
    return NatsResponse.success(result);
  }

  /**
   * 삭제 실행 수동 트리거
   */
  @MessagePattern('job.deletion.execute')
  async runDeletionExecutor() {
    const result = await this.jobSchedulerService.runJob('deletion-executor');
    return NatsResponse.success(result);
  }
}
