import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NatsConnectionService } from './nats-connection.service';

/**
 * Global NATS Module
 * 모든 모듈에서 NATS_CLIENT를 주입받아 사용할 수 있도록 글로벌 모듈로 설정
 */
@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NATS_CLIENT',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            reconnect: true,
            maxReconnectAttempts: 10,
            reconnectTimeWait: 1000,
            timeout: 30000,
            pingInterval: 10000,
            maxPingOut: 3,
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [NatsConnectionService],
  exports: [ClientsModule, NatsConnectionService],
})
export class NatsModule {}
