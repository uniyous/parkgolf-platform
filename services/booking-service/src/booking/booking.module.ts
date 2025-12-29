import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingController } from './controller/booking.controller';
import { BookingSagaController } from './controller/booking-saga.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingService } from './service/booking.service';
import { SagaHandlerService } from './service/saga-handler.service';
import { OutboxProcessorService } from './service/outbox-processor.service';
import { SagaSchedulerService } from './service/saga-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    BookingController,
    BookingSagaController,
  ],
  providers: [
    BookingService,
    SagaHandlerService,
    OutboxProcessorService,
    SagaSchedulerService,
  ],
})
export class BookingModule {}
