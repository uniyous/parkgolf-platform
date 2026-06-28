import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import type { PricingSnapshot } from '../db/schema';

/**
 * payment-service NATS 컨트롤러 (UNI-113 수납).
 * 진입 subject `payment.*` = manager-saga COLLECT_PAYMENT 계약과 일치.
 */
@Controller()
export class PaymentNatsController {
  private readonly logger = new Logger(PaymentNatsController.name);

  constructor(private readonly payment: PaymentService) {}

  // ===== saga COLLECT_PAYMENT (manager-saga → payment-service) =====

  @MessagePattern('payment.collect')
  async handleCollect(@Payload() data: {
    bookingId: number;
    amount: number;
    method: 'CASH' | 'CARD';
    channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
    staffId?: number;
    kioskId?: string;
    clubId?: number;
    companyId?: number;
    pricingSnapshot?: PricingSnapshot;
  }) {
    this.logger.log(`[payment.collect] bookingId=${data.bookingId} amount=${data.amount} method=${data.method}`);
    return this.payment.collect(data);
  }

  @MessagePattern('payment.refund')
  async handleRefund(@Payload() data: { bookingId: number }) {
    this.logger.log(`[payment.refund] bookingId=${data.bookingId}`);
    return this.payment.refund(data);
  }

  // ===== 조회·마감 (manager-bff → payment-service) =====

  @MessagePattern('payment.list')
  async handleList(@Payload() data: { clubId?: number; companyId?: number; status?: string; page?: number; limit?: number }) {
    return this.payment.list(data);
  }

  @MessagePattern('payment.get')
  async handleGet(@Payload() data: { id: number }) {
    return this.payment.get(data.id);
  }

  @MessagePattern('payment.dailyClose')
  async handleDailyClose(@Payload() data: { closeDate: string; clubId?: number; closedBy?: number; companyId?: number }) {
    this.logger.log(`[payment.dailyClose] date=${data.closeDate} club=${data.clubId}`);
    return this.payment.dailyClose(data);
  }
}
