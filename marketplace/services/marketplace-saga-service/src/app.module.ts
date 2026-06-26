import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { PgBossModule } from './common/pgboss/pgboss.module';
import { DrizzleModule } from './db/drizzle.module';
import { SagaModule } from './saga/saga.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CommonModule,
    NatsModule,
    PgBossModule,
    DrizzleModule,
    SagaModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
