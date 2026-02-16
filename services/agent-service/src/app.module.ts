import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { BookingAgentModule } from './booking-agent/booking-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    NatsModule,
    BookingAgentModule,
  ],
})
export class AppModule {}
