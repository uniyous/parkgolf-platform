import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendNatsController } from './friend-nats.controller';

@Module({
  imports: [],
  controllers: [FriendNatsController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
