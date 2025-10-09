import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { TimeSlotsController } from './time-slots.controller';
import { CourseService } from './courses.service';

@Module({
  controllers: [CoursesController, TimeSlotsController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CoursesModule {}