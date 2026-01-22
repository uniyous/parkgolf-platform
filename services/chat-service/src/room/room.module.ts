import { Module } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomNatsController } from './room-nats.controller';

@Module({
  controllers: [RoomNatsController],
  providers: [RoomService],
  exports: [RoomService],
})
export class RoomModule {}
