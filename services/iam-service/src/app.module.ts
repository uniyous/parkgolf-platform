import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { AdminModule } from './admin/admin.module';
import { CompanyModule } from './company/company.module';
import { FriendModule } from './friend/friend.module';
import { SettingsModule } from './settings/settings.module';
import { DeviceModule } from './device/device.module';
import { MenuModule } from './menu/menu.module';
import { CompanyMemberModule } from './company-member/company-member.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { NatsModule } from './common/nats/nats.module';

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
    MenuModule,
    CompanyMemberModule,
  ],
})
export class AppModule {}
