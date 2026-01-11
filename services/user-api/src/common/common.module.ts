import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';
import { SystemNatsController } from './controllers/system-nats.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController, SystemNatsController],
  providers: [],
  exports: [],
})
export class CommonModule {}
