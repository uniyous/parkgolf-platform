import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS Client Configuration for Job Service
 * 각 서비스에 배치 작업 NATS 요청을 전송하기 위한 클라이언트 설정
 */
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'NATS_CLIENT',
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
