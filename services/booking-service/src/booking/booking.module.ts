import { Module } from '@nestjs/common';
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
import { ParticipantCancelService } from './service/participant-cancel.service';

@Module({
  imports: [
    PrismaModule,
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
    ParticipantCancelService,
  ],
})
export class BookingModule {}
