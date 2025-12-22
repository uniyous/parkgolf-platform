import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { UsersModule } from '../users/users.module';
import { CoursesModule } from '../courses/courses.module';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [UsersModule, CoursesModule, BookingsModule, NotificationsModule],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}