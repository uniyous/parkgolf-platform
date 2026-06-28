import { Module } from '@nestjs/common';
import { BookingNatsController } from './booking-nats.controller';
import { BookingService } from './booking.service';

/**
 * 부킹 도메인 모듈 (UNI-114) — 데스크·전화·워크인·키오스크 예약.
 * DrizzleModule은 @Global → DrizzleService 자동 주입.
 */
@Module({
  controllers: [BookingNatsController],
  providers: [BookingService],
  exports: [BookingService],
})
export class BookingModule {}
