import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { PgProviderName } from '@uniyous/pg-provider';
import { PgGatewayService } from './pg-gateway.service';

/**
 * PG 설정 관리 NATS 컨트롤러 (UNI-130 [3c]) — manager-bff → payment-service.
 * 골프장별 PG 설정 등록·조회·해석. 실제 결제 경로는 [3c-ii].
 */
@Controller()
export class PgNatsController {
  private readonly logger = new Logger(PgNatsController.name);

  constructor(private readonly gateway: PgGatewayService) {}

  @MessagePattern('payment.pgConfig.upsert')
  async upsert(@Payload() data: {
    scopeLevel: 'PLATFORM' | 'COMPANY' | 'CLUB';
    companyId?: number;
    clubId?: number;
    provider: PgProviderName;
    secretRef: string;
    baseUrl?: string;
    active?: boolean;
  }) {
    this.logger.log(`[payment.pgConfig.upsert] scope=${data.scopeLevel} club=${data.clubId}`);
    return this.gateway.upsertConfig(data);
  }

  @MessagePattern('payment.pgConfig.list')
  async list() {
    return this.gateway.listConfigs();
  }

  @MessagePattern('payment.pgConfig.resolve')
  async resolve(@Payload() data: { clubId?: number; companyId?: number }) {
    return this.gateway.resolveConfig(data.clubId, data.companyId);
  }
}
