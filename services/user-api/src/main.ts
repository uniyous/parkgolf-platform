import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Parkgolf User Api API')
    .setDescription('API documentation for parkgolf-user-api')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = configService.get<number>('PORT') || 3092;
  await app.listen(port);
  
  console.log(`🚀 Parkgolf User API is running on port ${port}`);
  console.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
}

bootstrap();
