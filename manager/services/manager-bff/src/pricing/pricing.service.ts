import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../common/nats';
import { ApiResponse } from '../common/types';
import { QuoteDto, DiscountRuleDto } from './dto/pricing.dto';

/**
 * 요금/할인 BFF (UNI-137) — REST → NATS(club pricing.*).
 */
@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private readonly natsClient: NatsClientService) {}

  async quote(dto: QuoteDto): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('pricing.quote', dto, NATS_TIMEOUTS.QUICK);
  }

  async listDiscountRules(filter: { clubId?: number; companyId?: number; kind?: string; active?: boolean }): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('pricing.discountRule.list', filter, NATS_TIMEOUTS.LIST_QUERY);
  }

  async upsertDiscountRule(dto: DiscountRuleDto): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('pricing.discountRule.upsert', dto);
  }

  async deleteDiscountRule(id: number): Promise<ApiResponse<unknown>> {
    return this.natsClient.send('pricing.discountRule.delete', { id });
  }
}
