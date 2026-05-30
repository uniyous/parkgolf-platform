import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PgBoss } from 'pg-boss';
import type {
  ConstructorOptions,
  SendOptions,
  WorkOptions,
  Job,
} from 'pg-boss';

/**
 * pg-boss 통합 서비스
 *
 * 책임:
 *   - PostgreSQL 기반 지연/재시도/취소 가능한 job queue
 *   - saga timeout, payment timeout 등 이벤트 기반 지연 처리
 *
 * 멀티 pod 안전:
 *   - SELECT FOR UPDATE SKIP LOCKED 내장 (worker 측)
 *   - singletonKey로 producer 측 중복 차단
 */
@Injectable()
export class PgBossService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PgBossService.name);
  private boss!: PgBoss;
  private ready = false;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const connectionString = this.configService.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new Error('DATABASE_URL is required for pg-boss');
    }

    const options: ConstructorOptions = {
      connectionString,
      schema: 'pgboss',
    };

    this.boss = new PgBoss(options);

    this.boss.on('error', (err) => {
      this.logger.error(`[pg-boss] error: ${err.message}`, err.stack);
    });

    await this.boss.start();
    this.ready = true;
    this.logger.log('pg-boss started');
  }

  async onModuleDestroy() {
    if (this.boss && this.ready) {
      await this.boss.stop({ graceful: true });
      this.logger.log('pg-boss stopped');
    }
  }

  /**
   * 작업 예약 (지연 발사)
   */
  async send(
    queueName: string,
    data: object,
    options: SendOptions = {},
  ): Promise<string | null> {
    return this.boss.send(queueName, data, options);
  }

  /**
   * 작업 취소
   */
  async cancel(queueName: string, jobId: string): Promise<void> {
    await this.boss.cancel(queueName, jobId);
  }

  /**
   * Worker 등록
   */
  async work<T extends object = object>(
    queueName: string,
    handler: (job: Job<T>) => Promise<unknown>,
    options: WorkOptions = {},
  ): Promise<string> {
    return this.boss.work<T>(queueName, options, async (jobs) => {
      // pg-boss v10+: handler receives an array of jobs
      const job = Array.isArray(jobs) ? jobs[0] : jobs;
      return handler(job);
    });
  }

  /**
   * Queue 생성 (이름 기반 라우팅을 위해 필요)
   */
  async createQueue(queueName: string): Promise<void> {
    try {
      await this.boss.createQueue(queueName);
    } catch (err) {
      // Queue가 이미 존재하면 무시
      if (err instanceof Error && !err.message.includes('already exists')) {
        throw err;
      }
    }
  }
}
