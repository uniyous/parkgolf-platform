import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { PgProviderName } from '@uniyous/pg-provider';
import { SettlementService } from './settlement.service';

type Cycle = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type SettlementStatus = 'PENDING' | 'RECONCILED' | 'PAID';

/**
 * 정산 NATS 컨트롤러 (UNI-131 [4]) — manager-bff·job → payment-service.
 */
@Controller()
export class SettlementNatsController {
  private readonly logger = new Logger(SettlementNatsController.name);

  constructor(private readonly settlement: SettlementService) {}

  @MessagePattern('payment.settlement.run')
  async run(@Payload() data: {
    clubId: number;
    companyId?: number;
    provider: PgProviderName;
    cycle: Cycle;
    periodKey: string;
    periodStart?: string;
    periodEnd?: string;
  }) {
    this.logger.log(`[payment.settlement.run] ${data.cycle} ${data.periodKey} club=${data.clubId} ${data.provider}`);
    return this.settlement.run(data);
  }

  @MessagePattern('payment.settlement.list')
  async list(@Payload() data: {
    clubId?: number;
    provider?: PgProviderName;
    cycle?: Cycle;
    status?: SettlementStatus;
    page?: number;
    limit?: number;
  }) {
    return this.settlement.list(data);
  }

  @MessagePattern('payment.settlement.get')
  async get(@Payload() data: { id: number }) {
    return this.settlement.get(data.id);
  }

  @MessagePattern('payment.settlement.updateStatus')
  async updateStatus(@Payload() data: { id: number; status: SettlementStatus }) {
    this.logger.log(`[payment.settlement.updateStatus] id=${data.id} → ${data.status}`);
    return this.settlement.updateStatus(data);
  }
}
