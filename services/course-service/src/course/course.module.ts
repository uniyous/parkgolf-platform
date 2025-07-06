import { Module } from '@nestjs/common';
import { CourseService } from './service/course.service';
import { HoleService } from './service/hole.service';
import { TeeBoxService } from './service/tee-box.service';
import { CourseTimeSlotService } from './service/course-time-slot.service';
import { CourseWeeklyScheduleService } from './service/course-weekly-schedule.service';
import { CourseController } from './controller/course.controller';
import { HoleController } from './controller/hole.controller';
import { TeeBoxController } from './controller/tee-box.controller';
import { CourseTimeSlotController } from './controller/course-time-slot.controller';
import { CourseWeeklyScheduleController } from './controller/course-weekly-schedule.controller';

@Module({
  controllers: [CourseController, HoleController, TeeBoxController, CourseTimeSlotController, CourseWeeklyScheduleController],
  providers: [CourseService, HoleService, TeeBoxService, CourseTimeSlotService, CourseWeeklyScheduleService],
})
export class CourseModule {}
