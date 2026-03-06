import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { BookingNatsController } from './controller/booking-nats.controller';
import { BookingSagaController } from './controller/booking-saga.controller';
import { BookingSagaStepController } from './controller/booking-saga-step.controller';
import { TeamSelectionNatsController } from './controller/team-selection-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { BookingService } from './service/booking.service';
import { TeamSelectionService } from './service/team-selection.service';
import { SagaHandlerService } from './service/saga-handler.service';
import { BookingSagaStepService } from './service/booking-saga-step.service';
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
    BookingSagaStepController,
    TeamSelectionNatsController,
  ],
  providers: [
    BookingService,
    TeamSelectionService,
    SagaHandlerService,
    BookingSagaStepService,
    OutboxProcessorService,
    SagaSchedulerService,
  ],
})
export class BookingModule {}
