import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
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
  ],
  providers: [],
})
export class AppModule {}