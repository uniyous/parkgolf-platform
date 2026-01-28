import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification/notification.module';
import { NotificationNatsController } from './notification/notification-nats.controller';

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
    PrismaModule,
    NotificationModule,
  ],
  controllers: [NotificationNatsController],
  providers: [],
})
export class AppModule {}
