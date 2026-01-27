import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationModule } from './notification/notification.module';
import { NotificationEventService } from './microservice/notification-event.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath:
        process.env.NODE_ENV === 'development' ? '.env.development' : '.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    CommonModule,
    PrismaModule,
    NotificationModule,
  ],
  controllers: [NotificationEventService],
  providers: [],
})
export class AppModule {}
