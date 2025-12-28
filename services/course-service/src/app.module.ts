import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { CompanyModule } from './company/company.module';
import { ClubModule } from './club/club.module';
import { CourseModule } from './course/course.module';
import { GameModule } from './game/game.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    PrismaModule,
    CompanyModule,
    ClubModule,
    CourseModule,
    GameModule,
  ],
})
export class AppModule {}
