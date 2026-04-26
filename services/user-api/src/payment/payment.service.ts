import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../common/nats';
import { ApiResponse } from '../common/types';
import { AbandonPaymentDto, PreparePaymentDto, ConfirmPaymentDto, ConfirmSplitPaymentDto } from './dto/payment.dto';
import { NATS_TIMEOUTS } from '../common/constants';

export interface PreparePaymentResponse {
  orderId: string;
  amount: number;
  orderName: string;
}

export interface ConfirmPaymentResponse {
  paymentId: number;
  orderId: string;
  paymentKey: string;
  amount: number;
  status: string;
}

export interface PaymentStatusResponse {
  id: number;
  orderId: string;
  paymentKey: string | null;
  amount: number;
  status: string;
  bookingId: number | null;
}

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async preparePayment(userId: number, dto: PreparePaymentDto): Promise<ApiResponse<PreparePaymentResponse>> {
    this.logger.log(`Preparing payment for user ${userId}, amount: ${dto.amount}`);
    return this.natsClient.send('payment.prepare', {
      userId,
      amount: dto.amount,
      orderName: dto.orderName,
      bookingId: dto.bookingId,
    });
  }

  async confirmPayment(dto: ConfirmPaymentDto): Promise<ApiResponse<ConfirmPaymentResponse>> {
    this.logger.log(`Confirming payment orderId: ${dto.orderId}`);
    return this.natsClient.send('payment.confirm', {
      paymentKey: dto.paymentKey,
      orderId: dto.orderId,
      amount: dto.amount,
    }, NATS_TIMEOUTS.PAYMENT);
  }

  async confirmSplitPayment(userId: number, dto: ConfirmSplitPaymentDto): Promise<ApiResponse<ConfirmPaymentResponse>> {
    this.logger.log(`Confirming split payment for user ${userId}, orderId: ${dto.orderId}`);
    return this.natsClient.send('payment.splitConfirm', {
      userId,
      paymentKey: dto.paymentKey,
      orderId: dto.orderId,
      amount: dto.amount,
    }, NATS_TIMEOUTS.PAYMENT);
  }

  async getPaymentByOrderId(orderId: string): Promise<ApiResponse<PaymentStatusResponse>> {
    this.logger.log(`Getting payment by orderId: ${orderId}`);
    return this.natsClient.send('payment.getByOrderId', { orderId });
  }

  /**
   * 결제 중단 (실패/취소) 통지
   * Toss 결제창 onFail / onCancel 시 클라이언트가 호출.
   * payment-service에서 status=ABORTED + outbox `booking.paymentFailed` 발행 → PAYMENT_FAILED Saga 트리거.
   */
  async abandonPayment(orderId: string, dto: AbandonPaymentDto): Promise<ApiResponse<PaymentStatusResponse>> {
    this.logger.log(`Abandoning payment: orderId=${orderId} reason=${dto.reason}`);
    return this.natsClient.send('payment.markAborted', {
      orderId,
      reason: dto.reason,
      errorCode: dto.errorCode,
      errorMessage: dto.errorMessage,
    }, NATS_TIMEOUTS.PAYMENT);
  }
}
