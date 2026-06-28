import { Module } from '@nestjs/common';
import { PgNatsController } from './pg-nats.controller';
import { PgGatewayService } from './pg-gateway.service';
import { PgConfigResolver } from './pg-config.resolver';
import { PgProviderRegistry } from './pg-provider.registry';
import { PG_SECRET_PROVIDER, EnvPgSecretProvider } from './pg-secret.provider';

/**
 * PG 모듈 (UNI-130 [3c]) — 골프장별 PG 설정 해석 + 어댑터 레지스트리.
 * DrizzleModule은 @Global → DrizzleService 자동 주입.
 */
@Module({
  controllers: [PgNatsController],
  providers: [
    PgGatewayService,
    PgConfigResolver,
    PgProviderRegistry,
    { provide: PG_SECRET_PROVIDER, useClass: EnvPgSecretProvider },
  ],
  exports: [PgGatewayService],
})
export class PgModule {}
