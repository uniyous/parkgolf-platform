import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CheckoutFlowService } from './checkout-flow.service';

/**
 * 체크아웃 플로우 NATS 컨트롤러 (UNI-134) — manager-bff → frontdesk-service.
 * 입장(checkin)·수납(pay, 모두/개별)·취소·현황.
 */
@Controller()
export class CheckoutFlowController {
  private readonly logger = new Logger(CheckoutFlowController.name);

  constructor(private readonly flow: CheckoutFlowService) {}

  @MessagePattern('frontdesk.checkout.checkin')
  async checkin(@Payload() data: { bookingId: number; bookingPlayerIds?: number[] }) {
    this.logger.log(`[frontdesk.checkout.checkin] booking=${data.bookingId}`);
    return this.flow.checkin(data);
  }

  @MessagePattern('frontdesk.checkout.pay')
  async pay(@Payload() data: {
    bookingId: number;
    bookingPlayerIds: number[];
    method: 'CASH' | 'CARD';
    staffId?: number;
    idempotencyKey?: string;
  }) {
    this.logger.log(`[frontdesk.checkout.pay] booking=${data.bookingId} players=${data.bookingPlayerIds?.length} method=${data.method}`);
    return this.flow.pay(data);
  }

  @MessagePattern('frontdesk.checkout.cancel')
  async cancel(@Payload() data: { checkoutId: number; bookingPlayerIds?: number[]; reason?: string }) {
    this.logger.log(`[frontdesk.checkout.cancel] checkout=${data.checkoutId}`);
    return this.flow.cancel(data);
  }

  @MessagePattern('frontdesk.checkout.status')
  async status(@Payload() data: { bookingId: number }) {
    return this.flow.status(data.bookingId);
  }
}
