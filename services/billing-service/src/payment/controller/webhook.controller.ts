import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { payments, refunds, webhookLogs } from '../../db/schema';
import { PaymentStatus, RefundStatus, WebhookStatus } from '../../contracts/enums';
import { PaymentService } from '../service/payment.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    approvedAt?: string;
    cancels?: Array<{ transactionKey: string; cancelAmount: number; cancelReason: string; canceledAt: string }>;
    virtualAccount?: { accountNumber: string; bank: string; dueDate: string };
    secret?: string;
  };
}

@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly securityKey: string;

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.securityKey = this.configService.get<string>('TOSS_SECURITY_KEY') || '';
  }

  private get db() {
    return this.drizzle.db;
  }

  @Post('toss')
  @HttpCode(HttpStatus.OK)
  async handleTossWebhook(
    @Body() payload: TossWebhookPayload,
    @Headers('tosspayments-webhook-signature') signature?: string,
    @Headers('tosspayments-webhook-transmission-time') transmissionTime?: string,
  ) {
    this.logger.log(`Received webhook: ${payload.eventType} for ${payload.data.orderId}`);

    const [webhookLog] = await this.db
      .insert(webhookLogs)
      .values({ eventType: payload.eventType, payload: payload as object, status: WebhookStatus.RECEIVED })
      .returning();

    try {
      if (this.securityKey && signature && transmissionTime) {
        const isValid = this.verifySignature(payload, signature, transmissionTime);
        if (!isValid) {
          await this.updateWebhookLog(webhookLog.id, WebhookStatus.FAILED, '서명 검증 실패');
          this.logger.warn(`Invalid webhook signature for ${payload.data.orderId}`);
          return { success: false, message: 'Invalid signature' };
        }
      }

      await this.processWebhookEvent(payload);
      await this.updateWebhookLog(webhookLog.id, WebhookStatus.PROCESSED);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateWebhookLog(webhookLog.id, WebhookStatus.FAILED, errorMessage);
      this.logger.error(`Webhook processing failed: ${errorMessage}`, error);
      return { success: false, message: errorMessage };
    }
  }

  private async processWebhookEvent(payload: TossWebhookPayload) {
    const { eventType, data } = payload;
    switch (eventType) {
      case 'PAYMENT_STATUS_CHANGED':
        await this.handlePaymentStatusChanged(data);
        break;
      case 'DEPOSIT_CALLBACK':
        await this.handleDepositCallback(data);
        break;
      case 'CANCEL_STATUS_CHANGED':
        await this.handleCancelStatusChanged(data);
        break;
      default:
        this.logger.warn(`Unknown webhook event type: ${eventType}`);
    }
  }

  private async handlePaymentStatusChanged(data: TossWebhookPayload['data']) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.orderId, data.orderId)).limit(1);
    if (!payment) {
      this.logger.warn(`Payment not found for orderId: ${data.orderId}`);
      return;
    }

    const newStatus = this.mapPaymentStatus(data.status);
    if (payment.status === newStatus) {
      this.logger.log(`Payment status already ${newStatus}: ${data.orderId} (idempotent)`);
      return;
    }
    if (this.isTerminalStatus(payment.status)) {
      this.logger.warn(`Ignoring webhook regression: ${data.orderId} ${payment.status} → ${newStatus}`);
      return;
    }

    await this.db
      .update(payments)
      .set({ status: newStatus, paymentKey: data.paymentKey, approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined })
      .where(eq(payments.id, payment.id));
    this.logger.log(`Payment status updated: ${data.orderId} -> ${newStatus}`);
  }

  private async handleDepositCallback(data: TossWebhookPayload['data']) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.orderId, data.orderId)).limit(1);
    if (!payment) {
      this.logger.warn(`Payment not found for deposit callback: ${data.orderId}`);
      return;
    }
    if (payment.status === PaymentStatus.DONE) {
      this.logger.log(`Payment already DONE: ${data.orderId} (idempotent)`);
      return;
    }

    if (payment.metadata && typeof payment.metadata === 'object' && 'depositSecret' in (payment.metadata as object)) {
      const expectedSecret = (payment.metadata as Record<string, unknown>).depositSecret;
      if (data.secret !== expectedSecret) {
        this.logger.warn(`Deposit secret mismatch for orderId: ${data.orderId}`);
        return;
      }
    }

    await this.db.update(payments).set({ status: PaymentStatus.DONE, approvedAt: new Date() }).where(eq(payments.id, payment.id));

    await this.paymentService.createOutboxEvent('payment.deposited', {
      paymentId: payment.id, paymentKey: data.paymentKey, orderId: data.orderId, bookingId: payment.bookingId, userId: payment.userId,
    });
    this.logger.log(`Virtual account deposit confirmed: ${data.orderId}`);
  }

  private async handleCancelStatusChanged(data: TossWebhookPayload['data']) {
    const [payment] = await this.db.select().from(payments).where(eq(payments.orderId, data.orderId)).limit(1);
    if (!payment) {
      this.logger.warn(`Payment not found for cancel callback: ${data.orderId}`);
      return;
    }
    if (payment.status === PaymentStatus.CANCELED) {
      this.logger.log(`Payment already CANCELED: ${data.orderId} (idempotent)`);
      return;
    }

    if (data.cancels && data.cancels.length > 0) {
      const latestCancel = data.cancels[data.cancels.length - 1];
      const [existingRefund] = await this.db.select().from(refunds).where(eq(refunds.transactionKey, latestCancel.transactionKey)).limit(1);
      if (!existingRefund) {
        await this.db.insert(refunds).values({
          paymentId: payment.id,
          transactionKey: latestCancel.transactionKey,
          cancelAmount: latestCancel.cancelAmount,
          cancelReason: latestCancel.cancelReason,
          refundStatus: RefundStatus.COMPLETED,
          refundedAt: new Date(latestCancel.canceledAt),
        });
      }
    }

    const newStatus = this.mapPaymentStatus(data.status);
    if (payment.status !== newStatus && (newStatus === PaymentStatus.CANCELED || newStatus === PaymentStatus.PARTIAL_CANCELED)) {
      await this.db.update(payments).set({ status: newStatus }).where(eq(payments.id, payment.id));
      const totalCancelAmount = (data.cancels ?? []).reduce((s, c) => s + c.cancelAmount, 0);
      await this.paymentService.createOutboxEvent('payment.canceled', {
        paymentId: payment.id, paymentKey: data.paymentKey, cancelAmount: totalCancelAmount, bookingId: payment.bookingId, userId: payment.userId,
      });
    }
    this.logger.log(`Cancel status updated: ${data.orderId} -> ${newStatus}`);
  }

  private isTerminalStatus(status: PaymentStatus): boolean {
    return (
      status === PaymentStatus.DONE ||
      status === PaymentStatus.CANCELED ||
      status === PaymentStatus.PARTIAL_CANCELED ||
      status === PaymentStatus.ABORTED ||
      status === PaymentStatus.EXPIRED
    );
  }

  private verifySignature(payload: TossWebhookPayload, signature: string, transmissionTime: string): boolean {
    try {
      const message = `${JSON.stringify(payload)}:${transmissionTime}`;
      const computedHash = crypto.createHmac('sha256', this.securityKey).update(message).digest();
      const sigBody = signature.startsWith('v1:') ? signature.slice(3) : signature;
      const sigParts = sigBody.split(',');
      return sigParts.some((part) => {
        const decoded = Buffer.from(part.trim(), 'base64');
        return crypto.timingSafeEqual(computedHash, decoded);
      });
    } catch (error) {
      this.logger.error('Webhook signature verification error', error);
      return false;
    }
  }

  private async updateWebhookLog(id: number, status: WebhookStatus, errorMessage?: string) {
    await this.db
      .update(webhookLogs)
      .set({ status, errorMessage, processedAt: status === WebhookStatus.PROCESSED ? new Date() : undefined })
      .where(eq(webhookLogs.id, id));
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    const mapping: Record<string, PaymentStatus> = {
      READY: PaymentStatus.READY,
      IN_PROGRESS: PaymentStatus.IN_PROGRESS,
      WAITING_FOR_DEPOSIT: PaymentStatus.WAITING_FOR_DEPOSIT,
      DONE: PaymentStatus.DONE,
      CANCELED: PaymentStatus.CANCELED,
      PARTIAL_CANCELED: PaymentStatus.PARTIAL_CANCELED,
      ABORTED: PaymentStatus.ABORTED,
      EXPIRED: PaymentStatus.EXPIRED,
    };
    return mapping[status] || PaymentStatus.READY;
  }
}
