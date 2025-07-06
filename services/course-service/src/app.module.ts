import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { CourseModule } from './course/course.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [CommonModule, PrismaModule, CompanyModule, CourseModule],
})
export class AppModule {}
