import { Module } from '@nestjs/common';
import { PartnerConfigNatsController } from './controller/partner-config-nats.controller';
import { GameMappingNatsController } from './controller/game-mapping-nats.controller';
import { SyncNatsController } from './controller/sync-nats.controller';
import { WebhookController } from './controller/webhook.controller';
import { PartnerConfigService } from './service/partner-config.service';
import { GameMappingService } from './service/game-mapping.service';
import { CryptoService } from './service/crypto.service';
import { SyncService } from './service/sync.service';
import { WebhookService } from './service/webhook.service';

@Module({
  controllers: [
    PartnerConfigNatsController,
    GameMappingNatsController,
    SyncNatsController,
    WebhookController,
  ],
  providers: [
    PartnerConfigService,
    GameMappingService,
    CryptoService,
    SyncService,
    WebhookService,
  ],
  exports: [
    PartnerConfigService,
    GameMappingService,
    CryptoService,
    SyncService,
    WebhookService,
  ],
})
export class PartnerModule {}
