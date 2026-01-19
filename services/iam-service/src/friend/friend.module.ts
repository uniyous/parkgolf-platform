import { Module } from '@nestjs/common';
import { FriendService } from './friend.service';
import { FriendNatsController } from './friend-nats.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FriendNatsController],
  providers: [FriendService],
  exports: [FriendService],
})
export class FriendModule {}
