import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceNatsController } from './device-nats.controller';

@Module({
  imports: [],
  controllers: [DeviceNatsController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
