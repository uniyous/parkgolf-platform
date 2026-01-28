import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatGatewayModule } from './gateway/chat.gateway.module';
import { NatsModule } from './nats/nats.module';
import { AuthModule } from './auth/auth.module';
import { NotificationModule } from './notification/notification.module';
import { HealthController } from './common/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV}`, '.env'],
    }),
    AuthModule,
    NatsModule,
    ChatGatewayModule,
    NotificationModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
