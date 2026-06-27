import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsNatsController } from './settings-nats.controller';

@Module({
  imports: [],
  controllers: [SettingsNatsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
