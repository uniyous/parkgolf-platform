import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DrizzleModule } from './db/drizzle.module';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { PgBossModule } from './common/pgboss/pgboss.module';
import { PaymentModule } from './payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CommonModule,
    DrizzleModule,
    NatsModule,
    PgBossModule,
    PaymentModule,
  ],
})
export class AppModule {}
