import { Module } from '@nestjs/common';
import { BookingController } from './controller/booking.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingService } from './service/booking.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService],
})
export class BookingModule {}
