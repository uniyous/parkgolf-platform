import { Module } from '@nestjs/common';
import { GameService } from './service/game.service';
import { GameTimeSlotService } from './service/game-time-slot.service';
import { GameWeeklyScheduleService } from './service/game-weekly-schedule.service';
import { GameNatsController } from './controller/game-nats.controller';

@Module({
  controllers: [GameNatsController],
  providers: [
    GameService,
    GameTimeSlotService,
    GameWeeklyScheduleService,
  ],
  exports: [
    GameService,
    GameTimeSlotService,
    GameWeeklyScheduleService,
  ],
})
export class GameModule {}
