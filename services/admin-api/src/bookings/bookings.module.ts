import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingService } from './bookings.service';

@Module({
  controllers: [BookingsController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingsModule {}