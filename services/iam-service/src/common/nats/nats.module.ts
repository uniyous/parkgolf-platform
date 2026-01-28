import { Module, Global } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { NATS_CLIENT_OPTIONS } from './nats.config';

/**
 * Global NATS Module for IAM Service
 * notify-service 이벤트 발행을 위한 NATS 클라이언트 모듈
 */
@Global()
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  exports: [ClientsModule],
})
export class NatsModule {}
