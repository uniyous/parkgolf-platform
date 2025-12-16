import { Module } from '@nestjs/common';
import { ClubController } from './club.controller';
import { CoursesModule } from '../courses/courses.module';

@Module({
  imports: [CoursesModule],
  controllers: [ClubController],
  providers: [],
  exports: [],
})
export class ClubModule {}