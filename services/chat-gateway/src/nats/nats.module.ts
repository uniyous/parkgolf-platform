import { Module, Global } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NatsService } from './nats.service';

@Global()
@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'CHAT_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.NATS,
          options: {
            servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
            queue: 'chat-service',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [NatsService],
  exports: [NatsService],
})
export class NatsModule {}
