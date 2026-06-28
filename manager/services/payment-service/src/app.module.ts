import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { DrizzleModule } from './db/drizzle.module';
import { PaymentModule } from './payment/payment.module';
import { PgModule } from './pg/pg.module';
import { SettlementModule } from './settlement/settlement.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CommonModule,
    DrizzleModule,
    PaymentModule,
    PgModule,
    SettlementModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
