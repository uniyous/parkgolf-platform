import { Module } from '@nestjs/common';
import { FrontdeskController } from './frontdesk.controller';
import { FrontdeskService } from './frontdesk.service';

/**
 * Frontdesk Module (UNI-137) — 데스크 부킹·체크아웃 REST→NATS.
 * NatsClientService는 NatsModule(global) 제공.
 */
@Module({
  controllers: [FrontdeskController],
  providers: [FrontdeskService],
  exports: [FrontdeskService],
})
export class FrontdeskModule {}
