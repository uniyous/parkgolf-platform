import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS 아웃바운드 클라이언트 (UNI-132 [132b]) — club-service pricing.quote 호출용.
 */
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'CLUB_SERVICE',
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
