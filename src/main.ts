import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTO에 정의되지 않은 속성 자동 제거
      forbidNonWhitelisted: true, // DTO에 정의되지 않은 속성이 있으면 요청 거부
      transform: true, // 요청 데이터를 DTO 타입으로 자동 변환 (e.g., string to number)
      transformOptions: {
        enableImplicitConversion: true, // 암시적 타입 변환 활성화
      },
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Park Golf Course Service API')
    .setDescription(
      'API documentation for the Park Golf Course services including Tee Boxes.',
    )
    .setVersion('1.0')
    .addTag('Golf Companies') // 각 컨트롤러에 @ApiTags로 지정한 태그들
    .addTag('Golf Courses')
    .addTag('Golf Holes')
    .addTag('Golf Tee Boxes')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  await app.listen(3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(
    `Swagger API documentation available at: ${await app.getUrl()}/api-docs`,
  );
}

bootstrap();
