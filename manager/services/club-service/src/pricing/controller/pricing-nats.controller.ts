import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PricingService } from '../service/pricing.service';

/**
 * 요금/할인 NATS 컨트롤러 (UNI-132) — frontdesk·manager-bff → club-service.
 * pricing.quote = 항목별 견적 / discountRule.* = 할인 규칙 관리.
 */
@Controller()
export class PricingNatsController {
  private readonly logger = new Logger(PricingNatsController.name);

  constructor(private readonly pricing: PricingService) {}

  @MessagePattern('pricing.quote')
  async quote(@Payload() data: {
    clubId: number;
    gameTimeSlotId: number;
    companyId?: number;
    asOf?: string;
    players?: Array<{ memberContext?: Record<string, unknown>; surcharges?: Array<{ label: string; amount: number }> }>;
    playerCount?: number;
  }) {
    this.logger.log(`[pricing.quote] club=${data.clubId} slot=${data.gameTimeSlotId} players=${data.players?.length ?? data.playerCount}`);
    return this.pricing.quote(data);
  }

  @MessagePattern('pricing.discountRule.upsert')
  async upsertDiscountRule(@Payload() data: Parameters<PricingService['upsertDiscountRule']>[0]) {
    return this.pricing.upsertDiscountRule(data);
  }

  @MessagePattern('pricing.discountRule.list')
  async listDiscountRules(@Payload() data: { clubId?: number; companyId?: number; kind?: string; active?: boolean }) {
    return this.pricing.listDiscountRules(data);
  }

  @MessagePattern('pricing.discountRule.delete')
  async deleteDiscountRule(@Payload() data: { id: number }) {
    return this.pricing.deleteDiscountRule(data.id);
  }
}
