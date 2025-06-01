import { Module } from '@nestjs/common';
import { GolfCourseService } from './service/golf-course.service';
import { GolfHoleService } from './service/golf-hole.service';
import { GolfTeeBoxService } from './service/golf-tee-box.service';
import { CourseTimeSlotService } from './service/course-time-slot.service';
import { CourseWeeklyScheduleService } from './service/course-weekly-schedule.service';
import { GolfCourseController } from './controller/golf-course.controller';
import { GolfHoleController } from './controller/golf-hole.controller';
import { GolfTeeBoxController } from './controller/golf-tee-box.controller';
import { CourseTimeSlotController } from './controller/course-time-slot.controller';
import { CourseWeeklyScheduleController } from './controller/course-weekly-schedule.controller';

@Module({
  controllers: [GolfCourseController, GolfHoleController, GolfTeeBoxController, CourseTimeSlotController, CourseWeeklyScheduleController],
  providers: [GolfCourseService, GolfHoleService, GolfTeeBoxService, CourseTimeSlotService, CourseWeeklyScheduleService],
})
export class CourseModule {}
