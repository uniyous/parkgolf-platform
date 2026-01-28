import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS Client Configuration for Notify Service
 * iam-service 호출을 위한 NATS 클라이언트 설정 (디바이스 토큰 조회)
 */
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'IAM_SERVICE',
    imports: [ConfigModule],
    useFactory: (configService: ConfigService) => ({
      transport: Transport.NATS,
      options: {
        servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
      },
    }),
    inject: [ConfigService],
  },
];
