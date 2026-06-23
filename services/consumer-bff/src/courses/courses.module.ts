import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { ClubsController } from './clubs.controller';
import { CoursesService } from './courses.service';

@Module({
  imports: [],
  controllers: [CoursesController, ClubsController],
  providers: [CoursesService],
  exports: [CoursesService],
})
export class CoursesModule {}
