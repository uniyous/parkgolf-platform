import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
// Company module moved to iam-service - use NATS patterns 'iam.companies.*'
import { ClubModule } from './club/club.module';
import { CourseModule } from './course/course.module';
import { GameModule } from './game/game.module';
import { CommonModule } from './common/common.module';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';

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
  ],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseTransformInterceptor,
    },
  ],
})
export class AppModule {}
