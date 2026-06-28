import { Module } from '@nestjs/common';
import { SettlementNatsController } from './settlement-nats.controller';
import { SettlementService } from './settlement.service';
import { PgModule } from '../pg/pg.module';

/**
 * 정산 모듈 (UNI-131 [4]) — PG 결제 집계·대사.
 * PgModule에서 PgConfigResolver(수수료율) 주입. DrizzleModule은 @Global.
 */
@Module({
  imports: [PgModule],
  controllers: [SettlementNatsController],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
