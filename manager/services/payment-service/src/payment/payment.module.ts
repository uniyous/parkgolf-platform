import { Module } from '@nestjs/common';
import { PaymentNatsController } from './payment-nats.controller';
import { PaymentService } from './payment.service';

/**
 * 수납 도메인 모듈 (UNI-113) — 현장결제 기록·환불·일마감.
 */
@Module({
  controllers: [PaymentNatsController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
