import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CheckoutService } from './checkout.service';

/**
 * 체크아웃 수납 NATS 컨트롤러 (UNI-133) — frontdesk·manager-bff → payment-service.
 * 모두/개별 수납을 allocation 조합으로 처리.
 */
@Controller()
export class CheckoutNatsController {
  private readonly logger = new Logger(CheckoutNatsController.name);

  constructor(private readonly checkout: CheckoutService) {}

  @MessagePattern('payment.checkout.create')
  async create(@Payload() data: {
    bookingId: number;
    clubId?: number;
    companyId?: number;
    method: 'CASH' | 'CARD';
    allocations: Array<{ bookingPlayerId: number; amount: number }>;
    staffId?: number;
    kioskId?: string;
    channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
    idempotencyKey?: string;
  }) {
    this.logger.log(`[payment.checkout.create] booking=${data.bookingId} method=${data.method} players=${data.allocations?.length}`);
    return this.checkout.create(data);
  }

  @MessagePattern('payment.checkout.cancel')
  async cancel(@Payload() data: { checkoutId: number; reason?: string }) {
    this.logger.log(`[payment.checkout.cancel] checkoutId=${data.checkoutId}`);
    return this.checkout.cancel(data);
  }

  @MessagePattern('payment.checkout.get')
  async get(@Payload() data: { checkoutId: number }) {
    return this.checkout.get(data.checkoutId);
  }

  @MessagePattern('payment.checkout.listByBooking')
  async listByBooking(@Payload() data: { bookingId: number }) {
    return this.checkout.listByBooking(data.bookingId);
  }
}
