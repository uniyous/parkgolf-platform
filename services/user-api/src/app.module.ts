import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { AuthModule } from './auth/auth.module';
import { AccountModule } from './account/account.module';
import { BookingModule } from './booking/booking.module';
import { CoursesModule } from './courses/courses.module';
import { GamesModule } from './games/games.module';
import { NotifyModule } from './notify/notify.module';
import { FriendsModule } from './friends/friends.module';
import { ChatModule } from './chat/chat.module';
import { SettingsModule } from './settings/settings.module';
import { DevicesModule } from './devices/devices.module';
import { NatsModule } from './common/nats';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    NatsModule,
    CommonModule,
    AuthModule,
    AccountModule,
    BookingModule,
    CoursesModule,
    GamesModule,
    NotifyModule,
    FriendsModule,
    ChatModule,
    SettingsModule,
    DevicesModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
