import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/exceptions';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global HTTP exception filter (BFF layer - HTTP only)
    app.useGlobalFilters(new HttpExceptionFilter());

    // NATS client is configured in app.module.ts, not as microservice
    const natsUrl = configService.get<string>('NATS_URL') || 'nats://localhost:4222';
    logger.log(`🔗 NATS client configured: ${natsUrl}`);

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

    // Trust proxy for correct client IP behind GKE Ingress/Load Balancer
    // Required for ThrottlerGuard to track real client IPs via X-Forwarded-For
    app.getHttpAdapter().getInstance().set('trust proxy', true);

    // CORS configuration for admin frontend
    const corsOrigins = configService.get<string>('CORS_ALLOWED_ORIGINS');
    app.enableCors({
      origin: corsOrigins
        ? corsOrigins.split(',').map(o => o.trim())
        : [
            'http://localhost:3001',
            'https://parkgolf-admin.web.app',
            'https://parkgolf-admin-dev.web.app',
            'https://dev-api.goparkmate.com',
            'https://api.goparkmate.com',
          ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Swagger 설정
    const config = new DocumentBuilder()
      .setTitle('Parkgolf Admin BFF API')
      .setDescription('Backend For Frontend API for Parkgolf Admin Dashboard via NATS')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Admin Authentication')
      .addTag('users', 'User Management')
      .addTag('courses', 'Course Management')
      .addTag('bookings', 'Booking Management')
      .addTag('notifications', 'Notification Management')
      .addTag('analytics', 'Dashboard Analytics')
      .addTag('system', 'System Management')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    const port = parseInt(process.env.PORT || '8080');
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Parkgolf Admin BFF is running on port ${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
    logger.log(`🎯 BFF serving admin dashboard via NATS communication`);
  } catch (error) {
    logger.error('Failed to start Admin BFF', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});