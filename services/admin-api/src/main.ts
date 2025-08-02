import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { GlobalRpcExceptionFilter } from './common/exception/rpc-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global exception filter
    app.useGlobalFilters(new BaseExceptionFilter());

    // NATS microservice setup for client communication
    const natsUrl = configService.get<string>('NATS_URL') || 'nats://localhost:4222';
    
    try {
      const microservice = app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.NATS,
        options: {
          servers: [natsUrl],
          queue: 'admin-bff',
          reconnect: true,
          maxReconnectAttempts: 5,
          reconnectTimeWait: 1000,
        },
      });

      microservice.useGlobalFilters(new GlobalRpcExceptionFilter());
      logger.log(`🔗 NATS microservice client configured: ${natsUrl}`);
    } catch (error) {
      logger.error('Failed to configure NATS microservice client', error);
      throw error;
    }

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

    // CORS configuration for admin frontend
    app.enableCors({
      origin: [
        'http://localhost:3000', // Admin frontend dev
        'http://localhost:3001', // Admin frontend port 2
      ],
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

    await app.startAllMicroservices();

    const port = configService.get<number>('PORT') || 3091;
    await app.listen(port);

    logger.log(`🚀 Parkgolf Admin BFF is running on port ${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
    logger.log(`🔗 NATS microservice connected to: ${natsUrl}`);
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