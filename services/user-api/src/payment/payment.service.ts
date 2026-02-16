import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService } from '../common/nats';
import { ApiResponse } from '../common/types';
import { PreparePaymentDto, ConfirmPaymentDto } from './dto/payment.dto';
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

  async getPaymentByOrderId(orderId: string): Promise<ApiResponse<PaymentStatusResponse>> {
    this.logger.log(`Getting payment by orderId: ${orderId}`);
    return this.natsClient.send('payment.getByOrderId', { orderId });
  }
}
