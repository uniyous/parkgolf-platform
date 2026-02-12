import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { CommonModule } from './common/common.module';
import { SharedModule } from './postal/shared.module';
import { NatsModule } from './common/nats';
import { AuthModule } from './auth/auth.module';
import { AdminsModule } from './admins/admins.module';
import { CompaniesModule } from './companies/companies.module';
import { CoursesModule } from './courses/courses.module';
import { GamesModule } from './games/games.module';
import { BookingsModule } from './bookings/bookings.module';
import { NotificationsModule } from './notifications/notifications.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PoliciesModule } from './policies/policies.module';
import { MenusModule } from './menus/menus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 60,
    }]),
    NatsModule,
    CommonModule,
    SharedModule,
    AuthModule,
    AdminsModule,
    CompaniesModule,
    CoursesModule,
    GamesModule,
    BookingsModule,
    NotificationsModule,
    UsersModule,
    DashboardModule,
    PoliciesModule,
    MenusModule,
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