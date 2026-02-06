import { Controller, Post, Body, Headers, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PaymentService } from '../service/payment.service';
import { PaymentStatus, WebhookStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

/**
 * 토스페이먼츠 웹훅 이벤트 타입
 */
interface TossWebhookPayload {
  eventType: string;
  createdAt: string;
  data: {
    paymentKey: string;
    orderId: string;
    status: string;
    approvedAt?: string;
    cancels?: Array<{
      transactionKey: string;
      cancelAmount: number;
      cancelReason: string;
      canceledAt: string;
    }>;
    virtualAccount?: {
      accountNumber: string;
      bank: string;
      dueDate: string;
    };
    secret?: string;
  };
}

/**
 * 토스페이먼츠 웹훅 컨트롤러
 * 결제 상태 변경 알림 수신
 */
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>('TOSS_WEBHOOK_SECRET') || '';
  }

  /**
   * 토스페이먼츠 웹훅 수신
   * POST /webhook/toss
   */
  @Post('toss')
  @HttpCode(HttpStatus.OK)
  async handleTossWebhook(
    @Body() payload: TossWebhookPayload,
    @Headers('toss-signature') signature: string,
  ) {
    this.logger.log(`Received webhook: ${payload.eventType} for ${payload.data.orderId}`);

    // 1. 웹훅 로그 저장
    const webhookLog = await this.prisma.webhookLog.create({
      data: {
        eventType: this.mapEventType(payload.eventType),
        payload: payload as object,
        status: WebhookStatus.RECEIVED,
      },
    });

    try {
      // 2. 서명 검증 (프로덕션 환경에서만)
      if (this.webhookSecret && signature) {
        const isValid = this.verifySignature(payload, signature);
        if (!isValid) {
          await this.updateWebhookLog(webhookLog.id, WebhookStatus.FAILED, '서명 검증 실패');
          this.logger.warn(`Invalid webhook signature for ${payload.data.orderId}`);
          return { success: false, message: 'Invalid signature' };
        }
      }

      // 3. 이벤트 타입별 처리
      await this.processWebhookEvent(payload);

      // 4. 웹훅 처리 성공
      await this.updateWebhookLog(webhookLog.id, WebhookStatus.PROCESSED);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.updateWebhookLog(webhookLog.id, WebhookStatus.FAILED, errorMessage);
      this.logger.error(`Webhook processing failed: ${errorMessage}`, error);

      // 토스페이먼츠는 200을 받지 못하면 재시도하므로 에러 시에도 200 반환
      return { success: false, message: errorMessage };
    }
  }

  /**
   * 웹훅 이벤트 처리
   */
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

  /**
   * 결제 상태 변경 처리
   */
  private async handlePaymentStatusChanged(data: TossWebhookPayload['data']) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for orderId: ${data.orderId}`);
      return;
    }

    const newStatus = this.mapPaymentStatus(data.status);

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        paymentKey: data.paymentKey,
        approvedAt: data.approvedAt ? new Date(data.approvedAt) : undefined,
      },
    });

    this.logger.log(`Payment status updated: ${data.orderId} -> ${newStatus}`);
  }

  /**
   * 가상계좌 입금 확인 처리
   */
  private async handleDepositCallback(data: TossWebhookPayload['data']) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for deposit callback: ${data.orderId}`);
      return;
    }

    // 입금 확인 시크릿 검증
    if (data.secret) {
      // 필요 시 시크릿 검증 로직 추가
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.DONE,
        approvedAt: new Date(),
      },
    });

    // Outbox 이벤트 생성 (booking-service에 알림)
    await this.prisma.paymentOutboxEvent.create({
      data: {
        aggregateType: 'Payment',
        aggregateId: String(payment.id),
        eventType: 'payment.deposited',
        payload: {
          paymentId: payment.id,
          paymentKey: data.paymentKey,
          orderId: data.orderId,
          bookingId: payment.bookingId,
          userId: payment.userId,
        } as object,
        status: 'PENDING',
      },
    });

    this.logger.log(`Virtual account deposit confirmed: ${data.orderId}`);
  }

  /**
   * 취소 상태 변경 처리
   */
  private async handleCancelStatusChanged(data: TossWebhookPayload['data']) {
    const payment = await this.prisma.payment.findUnique({
      where: { orderId: data.orderId },
    });

    if (!payment) {
      this.logger.warn(`Payment not found for cancel callback: ${data.orderId}`);
      return;
    }

    // 최신 취소 정보 저장
    if (data.cancels && data.cancels.length > 0) {
      const latestCancel = data.cancels[data.cancels.length - 1];

      const existingRefund = await this.prisma.refund.findFirst({
        where: { transactionKey: latestCancel.transactionKey },
      });

      if (!existingRefund) {
        await this.prisma.refund.create({
          data: {
            paymentId: payment.id,
            transactionKey: latestCancel.transactionKey,
            cancelAmount: latestCancel.cancelAmount,
            cancelReason: latestCancel.cancelReason,
            refundStatus: 'COMPLETED',
            refundedAt: new Date(latestCancel.canceledAt),
          },
        });
      }
    }

    this.logger.log(`Cancel status updated: ${data.orderId}`);
  }

  /**
   * 서명 검증
   */
  private verifySignature(payload: TossWebhookPayload, signature: string): boolean {
    try {
      const payloadString = JSON.stringify(payload);
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payloadString)
        .digest('base64');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error('Signature verification error', error);
      return false;
    }
  }

  /**
   * 웹훅 로그 업데이트
   */
  private async updateWebhookLog(
    id: number,
    status: WebhookStatus,
    errorMessage?: string,
  ) {
    await this.prisma.webhookLog.update({
      where: { id },
      data: {
        status,
        errorMessage,
        processedAt: status === WebhookStatus.PROCESSED ? new Date() : undefined,
      },
    });
  }

  /**
   * 이벤트 타입 매핑 (문자열 그대로 반환)
   */
  private mapEventType(eventType: string): string {
    return eventType;
  }

  /**
   * 결제 상태 매핑
   */
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
