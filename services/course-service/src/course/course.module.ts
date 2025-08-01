import { Module } from '@nestjs/common';
import { CourseService } from './service/course.service';
import { HoleService } from './service/hole.service';
import { TeeBoxService } from './service/tee-box.service';
import { CourseWeeklyScheduleService } from './service/course-weekly-schedule.service';
import { CourseNatsController } from './controller/course-nats.controller';
import { HoleNatsController } from './controller/hole-nats.controller';

@Module({
  controllers: [
    CourseNatsController,
    HoleNatsController
  ],
  providers: [CourseService, HoleService, TeeBoxService, CourseWeeklyScheduleService],
})
export class CourseModule {}
