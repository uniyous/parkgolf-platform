import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { AuthModule } from '../auth/auth.module';
import { CoursesModule } from '../courses/courses.module';
import { BookingsModule } from '../bookings/bookings.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AuthModule, CoursesModule, BookingsModule, NotificationsModule],
  controllers: [DashboardController],
  providers: [],
  exports: [],
})
export class DashboardModule {}