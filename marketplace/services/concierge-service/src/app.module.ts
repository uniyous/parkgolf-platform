import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { RedisModule } from './common/redis/redis.module';
import { DrizzleModule } from './db/drizzle.module';
import { BookingAgentModule } from './booking-agent/booking-agent.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    NatsModule,
    RedisModule,
    DrizzleModule,
    BookingAgentModule,
  ],
})
export class AppModule {}
