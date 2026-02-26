import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingNatsController } from './controller/booking-nats.controller';
import { BookingSagaController } from './controller/booking-saga.controller';
import { BookingGroupNatsController } from './controller/booking-group-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingService } from './service/booking.service';
import { BookingGroupService } from './service/booking-group.service';
import { SagaHandlerService } from './service/saga-handler.service';
import { OutboxProcessorService } from './service/outbox-processor.service';
import { SagaSchedulerService } from './service/saga-scheduler.service';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    BookingNatsController,
    BookingSagaController,
    BookingGroupNatsController,
  ],
  providers: [
    BookingService,
    BookingGroupService,
    SagaHandlerService,
    OutboxProcessorService,
    SagaSchedulerService,
  ],
})
export class BookingModule {}
