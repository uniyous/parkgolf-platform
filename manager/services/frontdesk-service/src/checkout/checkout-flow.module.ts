import { Module } from '@nestjs/common';
import { CheckoutFlowController } from './checkout-flow.controller';
import { CheckoutFlowService } from './checkout-flow.service';

/**
 * 체크아웃 플로우 모듈 (UNI-134) — 입장·수납 오케스트레이션.
 * NatsModule(@Global)에서 PAYMENT_SERVICE 클라이언트 주입.
 */
@Module({
  controllers: [CheckoutFlowController],
  providers: [CheckoutFlowService],
  exports: [CheckoutFlowService],
})
export class CheckoutFlowModule {}
