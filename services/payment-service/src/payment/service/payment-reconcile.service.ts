import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job } from 'pg-boss';
import { PgBossService } from '../../common/pgboss/pgboss.service';
import { PaymentService } from './payment.service';

const RECONCILE_QUEUE = 'payment-reconcile';

interface ReconcileJobData {
  paymentId: number;
}

/**
 * 결제 reconcile 워커
 *
 * 처리 경로:
 *   - confirmPayment 진입 시 5분 지연 잡 발사
 *   - 5분 후 토스 getPayment로 실제 상태를 조회해 DB·outbox 정정
 *   - 종결 상태(DONE/ABORTED/CANCELED/...)면 worker가 skip (cancel 불필요)
 *
 * 멀티 pod 안전:
 *   - pg-boss SELECT FOR UPDATE SKIP LOCKED 내장
 */
@Injectable()
export class PaymentReconcileService implements OnModuleInit {
  private readonly logger = new Logger(PaymentReconcileService.name);

  constructor(
    private readonly pgboss: PgBossService,
    private readonly paymentService: PaymentService,
  ) {}

  async onModuleInit() {
    await this.pgboss.createQueue(RECONCILE_QUEUE);
    await this.pgboss.work<ReconcileJobData>(RECONCILE_QUEUE, (job) =>
      this.handleReconcile(job),
    );
    this.logger.log('Payment reconcile worker initialized (pg-boss)');
  }

  private async handleReconcile(job: Job<ReconcileJobData>): Promise<unknown> {
    return this.paymentService.reconcilePayment(job.data.paymentId);
  }
}
