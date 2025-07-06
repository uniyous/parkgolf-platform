import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { NatsServicesModule } from './services/nats-services.module';
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminCoursesController } from './controllers/admin-courses.controller';
import { AdminBookingsController } from './controllers/admin-bookings.controller';
import { AdminNotificationsController } from './controllers/admin-notifications.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';

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
    AdminCoursesController,
    AdminBookingsController,
    AdminNotificationsController,
    AdminDashboardController,
  ],
  providers: [],
})
export class AppModule {}