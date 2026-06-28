import { Injectable } from '@nestjs/common';
import type { JobSchedulerPort } from '@uniyous/saga-engine';
import { PgBossService } from '../../common/pgboss/pgboss.service';

/**
 * JobSchedulerPort의 pg-boss 어댑터 (UNI-127 ②) — saga timeout 등 지연 잡.
 */
@Injectable()
export class PgBossJobScheduler implements JobSchedulerPort {
  constructor(private readonly pgboss: PgBossService) {}

  schedule(
    queue: string,
    data: object,
    opts: { startAfter: number; singletonKey: string; retryLimit: number },
  ): Promise<string | null> {
    return this.pgboss.send(queue, data, {
      startAfter: opts.startAfter,
      singletonKey: opts.singletonKey,
      retryLimit: opts.retryLimit,
    });
  }

  cancel(queue: string, jobId: string): Promise<void> {
    return this.pgboss.cancel(queue, jobId);
  }
}
