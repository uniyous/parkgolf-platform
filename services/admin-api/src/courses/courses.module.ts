import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { TimeSlotsController } from './time-slots.controller';
import { CourseService } from './courses.service';

/**
 * Courses Module
 * NatsClientService is provided globally by NatsModule
 */
@Module({
  controllers: [CoursesController, TimeSlotsController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CoursesModule {}
