import { Module } from '@nestjs/common';
import { ClientsModule } from '@nestjs/microservices';
import { CoursesController } from './courses.controller';
import { TimeSlotsController } from './time-slots.controller';
import { CourseService } from './courses.service';
import { NATS_CLIENT_OPTIONS } from '../shared/nats';

/**
 * Courses Module
 */
@Module({
  imports: [ClientsModule.registerAsync(NATS_CLIENT_OPTIONS)],
  controllers: [CoursesController, TimeSlotsController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CoursesModule {}