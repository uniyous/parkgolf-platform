import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { JobModule } from './job/job.module';
import { JobNatsController } from './job/controller/job-nats.controller';

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
    JobModule,
  ],
  controllers: [JobNatsController],
  providers: [],
})
export class AppModule {}
