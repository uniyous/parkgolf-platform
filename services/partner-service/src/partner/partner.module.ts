import { Module } from '@nestjs/common';
import { PartnerConfigNatsController } from './controller/partner-config-nats.controller';
import { CourseMappingNatsController } from './controller/course-mapping-nats.controller';
import { PartnerConfigService } from './service/partner-config.service';
import { CourseMappingService } from './service/course-mapping.service';
import { CryptoService } from './service/crypto.service';

@Module({
  controllers: [
    PartnerConfigNatsController,
    CourseMappingNatsController,
  ],
  providers: [
    PartnerConfigService,
    CourseMappingService,
    CryptoService,
  ],
  exports: [
    PartnerConfigService,
    CourseMappingService,
    CryptoService,
  ],
})
export class PartnerModule {}
