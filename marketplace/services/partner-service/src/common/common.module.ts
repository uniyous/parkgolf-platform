import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';
import { NatsModule } from './nats/nats.module';

@Global()
@Module({
  imports: [ConfigModule, NatsModule],
  controllers: [HealthController],
  providers: [],
  exports: [NatsModule],
})
export class CommonModule {}
