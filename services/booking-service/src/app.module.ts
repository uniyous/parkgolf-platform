import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module';
import { CommonModule } from './common/common.module';
import { PgBossModule } from './common/pgboss/pgboss.module';
import { BookingModule } from './booking/booking.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    DrizzleModule,
    PgBossModule,
    BookingModule,
  ],
})
export class AppModule {}
