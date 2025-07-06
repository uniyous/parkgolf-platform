import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [],
  exports: [],
})
export class CommonModule {}