import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
  providers: [],
})
export class AppModule {}
