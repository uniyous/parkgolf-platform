import { Module } from '@nestjs/common';
import { BookingNatsController } from './controller/booking-nats.controller';
import { BookingSagaController } from './controller/booking-saga.controller';
import { BookingSagaStepController } from './controller/booking-saga-step.controller';
import { TeamSelectionNatsController } from './controller/team-selection-nats.controller';
import { BookingService } from './service/booking.service';
import { TeamSelectionService } from './service/team-selection.service';
import { SagaHandlerService } from './service/saga-handler.service';
import { BookingSagaStepService } from './service/booking-saga-step.service';
import { OutboxProcessorService } from './service/outbox-processor.service';
import { ParticipantCancelService } from './service/participant-cancel.service';
import { InternalClubProvider } from './inventory/internal-club.provider';
import { INVENTORY_PROVIDER } from './inventory/inventory-provider.interface';

@Module({
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
    InternalClubProvider,
    // 결정 B: booking-service는 1st-party(InternalClub)만 사용. partner는 marketplace-saga-service가 선택.
    { provide: INVENTORY_PROVIDER, useExisting: InternalClubProvider },
  ],
})
export class BookingModule {}
