import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsNatsController } from './settings-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SettingsNatsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
