import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CourseService } from './courses.service';

/**
 * Courses Module
 * Manages Club, Course, Hole, and Weekly Schedule domains
 * NatsClientService is provided globally by NatsModule
 */
@Module({
  controllers: [CoursesController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CoursesModule {}
