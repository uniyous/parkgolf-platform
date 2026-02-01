import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/exceptions';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Global HTTP exception filter (BFF layer - HTTP only)
  app.useGlobalFilters(new HttpExceptionFilter());

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

  const corsOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS');
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map(o => o.trim())
      : [
          'http://localhost:3001',
          'http://localhost:3002',
          'https://parkgolf-admin.web.app',
          'https://parkgolf-admin-dev.web.app',
          'https://parkgolf-user.web.app',
          'https://parkgolf-user-dev.web.app',
          'https://dev-api.goparkmate.com',
          'https://api.goparkmate.com',
        ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Parkgolf User Api API')
    .setDescription('API documentation for parkgolf-user-api')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

  const port = parseInt(process.env.PORT || '8080');
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Parkgolf User API is running on port ${port}`);
  logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
