import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';
import { WarmupController } from './controllers/warmup.controller';
import { WarmupService } from './services/warmup.service';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController, WarmupController],
  providers: [WarmupService],
  exports: [WarmupService],
})
export class CommonModule {}
