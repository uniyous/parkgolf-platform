import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { NatsServicesModule } from './services/nats-services.module';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminAdminsController } from './controllers/admin-admins.controller';
import { AdminCoursesController } from './controllers/admin-courses.controller';
import { AdminBookingsController } from './controllers/admin-bookings.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminTimeSlotsController } from './controllers/admin-time-slots.controller';
import { PostalController } from './controllers/postal.controller';
import { AdminClubController } from './controllers/admin-club.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    NatsServicesModule,
  ],
  controllers: [
    AdminAuthController,
    AdminUsersController,
    AdminAdminsController,
    AdminCoursesController,
    AdminBookingsController,
    AdminNotificationsController,
    AdminDashboardController,
    AdminTimeSlotsController,
    PostalController,
    AdminClubController,
  ],
  providers: [],
})
export class AppModule {}