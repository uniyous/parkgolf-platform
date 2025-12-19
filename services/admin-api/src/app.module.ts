import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { SharedModule } from './postal/shared.module';
import { NatsModule } from './shared/nats';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { CoursesModule } from './courses/courses.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ClubModule } from './club/club.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    NatsModule,
    CommonModule,
    SharedModule,
    AuthModule,
    AdminsModule,
    CoursesModule,
    BookingsModule,
    NotificationsModule,
    UsersModule,
    DashboardModule,
    ClubModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}