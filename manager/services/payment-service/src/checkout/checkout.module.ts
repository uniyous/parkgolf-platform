import { Module } from '@nestjs/common';
import { CheckoutNatsController } from './checkout-nats.controller';
import { CheckoutService } from './checkout.service';

/**
 * 체크아웃 수납 모듈 (UNI-133) — checkout + allocation. DrizzleModule @Global.
 */
@Module({
  controllers: [CheckoutNatsController],
  providers: [CheckoutService],
  exports: [CheckoutService],
})
export class CheckoutModule {}
