import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { PgBossModule } from './common/pgboss/pgboss.module';
import { BookingModule } from './booking/booking.module';
import { PolicyModule } from './policy/policy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    PrismaModule,
    PgBossModule,
    BookingModule,
    PolicyModule,
  ],
})
export class AppModule {}
