import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { CompanyModule } from './company/company.module';
import { FriendModule } from './friend/friend.module';
import { SettingsModule } from './settings/settings.module';
import { DeviceModule } from './device/device.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    NatsModule,
    PrismaModule,
    AuthModule,
    UserModule,
    AdminModule,
    CompanyModule,
    FriendModule,
    SettingsModule,
    DeviceModule,
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule {}
