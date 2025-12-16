import { Module } from '@nestjs/common';
import { CourseService } from './service/course.service';
import { HoleService } from './service/hole.service';
import { TeeBoxService } from './service/tee-box.service';
import { CourseWeeklyScheduleService } from './service/course-weekly-schedule.service';
import { ClubService } from './service/club.service';
import { CourseNatsController } from './controller/course-nats.controller';
import { HoleNatsController } from './controller/hole-nats.controller';
import { ClubNatsController } from './controller/club-nats.controller';

@Module({
  controllers: [
    CourseNatsController,
    HoleNatsController,
    ClubNatsController
  ],
  providers: [CourseService, HoleService, TeeBoxService, CourseWeeklyScheduleService, ClubService],
})
export class CourseModule {}
