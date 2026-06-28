import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import type { PgProviderName } from '@uniyous/pg-provider';
import type { PricingSnapshot } from '../db/schema';
import { PgGatewayService } from './pg-gateway.service';
import { PgPaymentService } from './pg-payment.service';

/**
 * PG NATS 컨트롤러 (UNI-130 [3c]) — manager-bff·frontdesk → payment-service.
 * 설정 관리(pgConfig.*) + 온라인 PG 결제 경로(pg.confirm/cancel).
 */
@Controller()
export class PgNatsController {
  private readonly logger = new Logger(PgNatsController.name);

  constructor(
    private readonly gateway: PgGatewayService,
    private readonly pgPayment: PgPaymentService,
  ) {}

  // ===== 온라인 PG 결제 (frontdesk → payment-service) =====

  @MessagePattern('payment.pg.confirm')
  async confirm(@Payload() data: {
    bookingId: number;
    paymentKey: string;
    orderId: string;
    amount: number;
    clubId?: number;
    companyId?: number;
    staffId?: number;
    kioskId?: string;
    channel?: 'DESK' | 'PHONE' | 'WALK_IN' | 'KIOSK';
    pricingSnapshot?: PricingSnapshot;
  }) {
    this.logger.log(`[payment.pg.confirm] bookingId=${data.bookingId} amount=${data.amount} club=${data.clubId}`);
    return this.pgPayment.confirm(data);
  }

  @MessagePattern('payment.pg.cancel')
  async cancel(@Payload() data: { bookingId: number; cancelReason?: string; cancelAmount?: number }) {
    this.logger.log(`[payment.pg.cancel] bookingId=${data.bookingId}`);
    return this.pgPayment.cancel(data);
  }

  // ===== PG 설정 관리 (manager-bff) =====

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
