import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS Client Configuration for Course Service
 * 외부 서비스 호출을 위한 NATS 클라이언트 설정
 *
 * Note: BOOKING_SERVICE 클라이언트는 제거됨.
 * Saga 후속 처리(slot.reserved/slot.reserve.failed)는
 * booking-service OutboxProcessor가 Request-Reply 응답 수신 후 직접 호출하므로
 * fire-and-forget emit이 불필요.
 */
export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  {
    name: 'LOCATION_SERVICE',
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
