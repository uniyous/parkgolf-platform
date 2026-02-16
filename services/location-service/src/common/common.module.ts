import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './controllers/health.controller';

@Global()
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
})
export class CommonModule {}
