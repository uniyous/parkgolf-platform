import { Module } from '@nestjs/common';
import { PartnerConfigNatsController } from './controller/partner-config-nats.controller';
import { CourseMappingNatsController } from './controller/course-mapping-nats.controller';
import { SyncNatsController } from './controller/sync-nats.controller';
import { PartnerConfigService } from './service/partner-config.service';
import { CourseMappingService } from './service/course-mapping.service';
import { CryptoService } from './service/crypto.service';
import { SyncService } from './service/sync.service';

@Module({
  controllers: [
    PartnerConfigNatsController,
    CourseMappingNatsController,
    SyncNatsController,
  ],
  providers: [
    PartnerConfigService,
    CourseMappingService,
    CryptoService,
    SyncService,
  ],
  exports: [
    PartnerConfigService,
    CourseMappingService,
    CryptoService,
    SyncService,
  ],
})
export class PartnerModule {}
