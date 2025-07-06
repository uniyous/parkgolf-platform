import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AuthService } from './auth.service';
import { CourseService } from './course.service';
import { BookingService } from './booking.service';
import { NotificationService } from './notification.service';

@Module({
  imports: [HttpModule],
  providers: [
    AuthService,
    CourseService,
    BookingService,
    NotificationService,
  ],
  exports: [
    AuthService,
    CourseService,
    BookingService,
    NotificationService,
  ],
})
export class ServicesModule {}