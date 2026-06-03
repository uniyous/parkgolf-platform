import { Module } from '@nestjs/common';
import { ClubService } from './service/club.service';
import { ClubNatsController } from './controller/club-nats.controller';

@Module({
  controllers: [ClubNatsController],
  providers: [ClubService],
  exports: [ClubService],
})
export class ClubModule {}
