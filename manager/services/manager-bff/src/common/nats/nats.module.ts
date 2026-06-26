import { Module, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NATS_CLIENT_OPTIONS } from './nats.config';
import { NatsClientService } from './nats-client.service';

/**
 * Global NATS Module
 * 모든 모듈에서 NatsClientService를 주입받아 사용
 */
@Global()
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  providers: [NatsClientService],
  exports: [ClientsModule, NatsClientService],
})
export class NatsModule {}
