import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ClubModule } from './club/club.module';
import { CourseModule } from './course/course.module';
import { GameModule } from './game/game.module';
import { CommonModule } from './common/common.module';
import { PolicyModule } from './policy/policy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    CommonModule,
    PrismaModule,
    ClubModule,
    CourseModule,
    GameModule,
    PolicyModule,
  ],
})
export class AppModule {}
