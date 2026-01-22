import { Module } from '@nestjs/common';
import { DeviceService } from './device.service';
import { DeviceNatsController } from './device-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DeviceNatsController],
  providers: [DeviceService],
  exports: [DeviceService],
})
export class DeviceModule {}
