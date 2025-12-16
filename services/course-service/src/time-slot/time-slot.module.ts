import { Module } from '@nestjs/common';
import { TimeSlotService } from './service/time-slot.service';
import { TimeSlotNatsController } from './controller/time-slot-nats.controller';

@Module({
  controllers: [TimeSlotNatsController],
  providers: [TimeSlotService],
  exports: [TimeSlotService],
})
export class TimeSlotModule {}