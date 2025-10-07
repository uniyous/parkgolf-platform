import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    // Only register NATS client if NATS_URL is configured
    ...(process.env.NATS_URL && process.env.NATS_URL !== 'disabled'
      ? [ClientsModule.registerAsync([
          {
            name: 'NATS_CLIENT',
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
              transport: Transport.NATS,
              options: {
                servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
                reconnect: true,
                maxReconnectAttempts: 5,
                reconnectTimeWait: 1000,
              },
            }),
            inject: [ConfigService],
          },
        ])]
      : []),
  ],
  controllers: [HealthController],
  providers: [],
  exports: process.env.NATS_URL && process.env.NATS_URL !== 'disabled' ? [ClientsModule] : [],
})
export class CommonModule {}
