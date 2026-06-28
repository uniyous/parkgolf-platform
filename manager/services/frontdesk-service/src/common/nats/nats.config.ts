import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsProviderAsyncOptions, Transport } from '@nestjs/microservices';

/**
 * NATS 아웃바운드 클라이언트 — club-service pricing.quote(UNI-132) · payment-service checkout(UNI-134).
 */
const natsFactory = (configService: ConfigService) => ({
  transport: Transport.NATS as const,
  options: {
    servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
  },
});

export const NATS_CLIENT_OPTIONS: ClientsProviderAsyncOptions[] = [
  { name: 'CLUB_SERVICE', imports: [ConfigModule], useFactory: natsFactory, inject: [ConfigService] },
  { name: 'PAYMENT_SERVICE', imports: [ConfigModule], useFactory: natsFactory, inject: [ConfigService] },
];
