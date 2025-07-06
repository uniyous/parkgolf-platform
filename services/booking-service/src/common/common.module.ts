import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
    ClientsModule.register([
      {
        name: 'NOTIFICATION_SERVICE',
        transport: Transport.NATS,
        options: {
          servers: ['nats://localhost:4222'],
        },
      },
    ]),
  ],
  controllers: [HealthController],
  providers: [],
  exports: [ClientsModule],
})
export class CommonModule {}
