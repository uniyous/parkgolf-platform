import { Module } from '@nestjs/common';
import { PricingNatsController } from './controller/pricing-nats.controller';
import { PricingService } from './service/pricing.service';

/**
 * 요금 계산엔진 모듈 (UNI-132) — pricing.quote + 할인 규칙(discount_rules).
 */
@Module({
  controllers: [PricingNatsController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
