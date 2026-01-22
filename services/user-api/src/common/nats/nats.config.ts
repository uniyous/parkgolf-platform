import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModuleAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS Client Configuration
 * 환경변수 기반 동적 설정
 */
export const NATS_CLIENT_OPTIONS: ClientsModuleAsyncOptions = [
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
];
