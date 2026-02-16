import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';

const NATS_TIMEOUT_MS = 30000;

@Injectable()
export class JobSchedulerService {
  private readonly logger = new Logger(JobSchedulerService.name);

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * 계정 삭제 리마인더 발송
   * 매일 09:00 KST (UTC 00:00) — D-3, D-1 사용자에게 알림
   */
  @Cron('0 0 * * *', { name: 'deletion-reminder', timeZone: 'Asia/Seoul' })
  async handleDeletionReminder() {
    this.logger.log('[deletion-reminder] Starting...');

    const result = await this.sendNatsRequest(
      'iam.deletion.processReminders',
      {},
    );

    this.logger.log(`[deletion-reminder] Result: ${JSON.stringify(result)}`);
  }

  /**
   * 계정 삭제 실행
   * 매일 03:00 KST (UTC 18:00) — 유예 기간 만료 사용자 삭제
   */
  @Cron('0 3 * * *', { name: 'deletion-executor', timeZone: 'Asia/Seoul' })
  async handleDeletionExecutor() {
    this.logger.log('[deletion-executor] Starting...');

    const result = await this.sendNatsRequest(
      'iam.deletion.execute',
      {},
    );

    this.logger.log(`[deletion-executor] Result: ${JSON.stringify(result)}`);
  }

  /**
   * 수동 실행용 메서드
   */
  async runJob(jobName: string): Promise<any> {
    switch (jobName) {
      case 'deletion-reminder':
        return this.sendNatsRequest('iam.deletion.processReminders', {});
      case 'deletion-executor':
        return this.sendNatsRequest('iam.deletion.execute', {});
      default:
        return { success: false, error: `Unknown job: ${jobName}` };
    }
  }

  /**
   * 등록된 배치 작업 목록 조회
   */
  getRegisteredJobs() {
    return [
      {
        name: 'deletion-reminder',
        schedule: '0 0 * * * (09:00 KST)',
        pattern: 'iam.deletion.processReminders',
        description: 'D-3, D-1 삭제 예정 사용자 리마인더 알림',
      },
      {
        name: 'deletion-executor',
        schedule: '0 3 * * * (03:00 KST)',
        pattern: 'iam.deletion.execute',
        description: '유예 기간 만료 사용자 삭제 실행',
      },
    ];
  }

  private async sendNatsRequest(pattern: string, data: any): Promise<any> {
    try {
      const result = await firstValueFrom(
        this.natsClient.send(pattern, data).pipe(
          timeout(NATS_TIMEOUT_MS),
          catchError((err) => {
            this.logger.error(`[${pattern}] NATS request failed: ${err.message}`);
            return of({ success: false, error: err.message });
          }),
        ),
      );
      return result;
    } catch (error) {
      this.logger.error(`[${pattern}] Error: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}
