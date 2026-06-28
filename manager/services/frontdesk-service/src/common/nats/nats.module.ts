import { Module, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NATS_CLIENT_OPTIONS } from './nats.config';

/**
 * Global NATS 모듈 (UNI-132 [132b]) — club-service 아웃바운드 호출(pricing.quote).
 */
@Global()
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  exports: [ClientsModule],
})
export class NatsModule {}
