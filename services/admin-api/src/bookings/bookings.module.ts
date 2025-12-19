import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { BookingsController } from './bookings.controller';
import { BookingService } from './bookings.service';
import { NATS_CLIENT_OPTIONS } from '../shared/nats';

/**
 * Bookings Module
 */
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  controllers: [BookingsController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingsModule {}