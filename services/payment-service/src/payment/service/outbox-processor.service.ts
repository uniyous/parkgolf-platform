import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { eq, count } from 'drizzle-orm';
import { firstValueFrom, timeout } from 'rxjs';
import type { Job } from 'pg-boss';
import { DrizzleService } from '../../db/drizzle.service';
import { paymentOutboxEvents } from '../../db/schema';
import { OutboxStatus } from '../../contracts/enums';
import { PgBossService } from '../../common/pgboss/pgboss.service';

const OUTBOX_QUEUE = 'payment-outbox-publish';

interface OutboxJobData {
  outboxEventId: number;
}

@Injectable()
export class OutboxProcessorService implements OnModuleInit {
  private readonly logger = new Logger(OutboxProcessorService.name);
  private readonly maxRetries = 5;
  private readonly sendTimeoutMs = 10_000;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly pgboss: PgBossService,
    @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    @Inject('NOTIFICATION_SERVICE') private readonly notificationClient: ClientProxy,
  ) {}

  private get db() {
    return this.drizzle.db;
  }

  async onModuleInit() {
    await this.bookingClient.connect();
    await this.notificationClient.connect();
    await this.pgboss.createQueue(OUTBOX_QUEUE);
    await this.pgboss.work<OutboxJobData>(OUTBOX_QUEUE, (job) => this.handleOutboxJob(job));
    this.logger.log('Outbox processor initialized (pg-boss worker)');
  }

  private async handleOutboxJob(job: Job<OutboxJobData>): Promise<unknown> {
    const [event] = await this.db.select().from(paymentOutboxEvents).where(eq(paymentOutboxEvents.id, job.data.outboxEventId)).limit(1);
    if (!event) return { skipped: true, reason: 'not_found' };
    if (event.status !== OutboxStatus.PENDING) return { skipped: true, currentStatus: event.status };
    return this.processEvent(event);
  }

  private async processEvent(event: { id: number; eventType: string; payload: unknown; retryCount: number }) {
    try {
      await this.sendEvent(event.eventType, event.payload as Record<string, unknown>);
      await this.db.update(paymentOutboxEvents).set({ status: OutboxStatus.SENT, processedAt: new Date() }).where(eq(paymentOutboxEvents.id, event.id));
      this.logger.log(`Event processed: ${event.eventType} (id: ${event.id})`);
    } catch (error) {
      const newRetryCount = event.retryCount + 1;
      const newStatus = newRetryCount >= this.maxRetries ? OutboxStatus.FAILED : OutboxStatus.PENDING;
      await this.db
        .update(paymentOutboxEvents)
        .set({ status: newStatus, retryCount: newRetryCount, lastError: error instanceof Error ? error.message : 'Unknown error' })
        .where(eq(paymentOutboxEvents.id, event.id));
      this.logger.warn(`Event failed: ${event.eventType} (id: ${event.id}, retry: ${newRetryCount})`);
    }
  }

  private async sendEvent(eventType: string, payload: Record<string, unknown>) {
    const pattern = this.getPattern(eventType);
    const client = this.getClient(eventType);
    await firstValueFrom(client.send(pattern, payload).pipe(timeout(this.sendTimeoutMs)));
  }

  private getPattern(eventType: string): string {
    const patternMap: Record<string, string> = {
      'payment.confirmed': 'booking.paymentConfirmed',
      'payment.canceled': 'booking.paymentCanceled',
      'payment.deposited': 'booking.paymentDeposited',
      'payment.failed': 'booking.paymentFailed',
    };
    return patternMap[eventType] || eventType;
  }

  private getClient(eventType: string): ClientProxy {
    if (eventType.startsWith('payment.')) return this.bookingClient;
    if (eventType.startsWith('notification.')) return this.notificationClient;
    return this.bookingClient;
  }

  async retryFailedEvents() {
    const rows = await this.db
      .update(paymentOutboxEvents)
      .set({ status: OutboxStatus.PENDING, retryCount: 0, lastError: null })
      .where(eq(paymentOutboxEvents.status, OutboxStatus.FAILED))
      .returning({ id: paymentOutboxEvents.id });
    this.logger.log(`Reset ${rows.length} failed events for retry`);
    return rows.length;
  }

  async getEventStats() {
    const [pendingR, sentR, failedR] = await Promise.all([
      this.db.select({ value: count() }).from(paymentOutboxEvents).where(eq(paymentOutboxEvents.status, OutboxStatus.PENDING)),
      this.db.select({ value: count() }).from(paymentOutboxEvents).where(eq(paymentOutboxEvents.status, OutboxStatus.SENT)),
      this.db.select({ value: count() }).from(paymentOutboxEvents).where(eq(paymentOutboxEvents.status, OutboxStatus.FAILED)),
    ]);
    const pending = pendingR[0].value;
    const sent = sentR[0].value;
    const failed = failedR[0].value;
    return { pending, sent, failed, total: pending + sent + failed };
  }
}
