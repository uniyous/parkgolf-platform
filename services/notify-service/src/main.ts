import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting Notify Service...');

    const app = await NestFactory.create(AppModule);

    // Global unified exception filter (handles both HTTP and RPC)
    app.useGlobalFilters(new UnifiedExceptionFilter());

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
      .setTitle('Parkgolf Notify Service API')
      .setDescription('API documentation for parkgolf-notify-service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    logger.log(`🌐 Starting HTTP server on port ${port}...`);
    logger.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Notify Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://localhost:${port}/health`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);

    // Connect NATS microservice asynchronously (optional for Cloud Run)
    if (process.env.NATS_URL) {
      logger.log(`📡 NATS_URL found: ${process.env.NATS_URL}`);
      setImmediate(async () => {
        try {
          logger.log('🔗 Attempting NATS connection...');
          // inheritAppConfig: true - inherit global pipes, interceptors, guards, filters
          app.connectMicroservice<MicroserviceOptions>(
            {
              transport: Transport.NATS,
              options: {
                servers: [process.env.NATS_URL],
                queue: 'notify-service',
                reconnect: true,
                maxReconnectAttempts: 3,
                reconnectTimeWait: 2000,
              },
            },
            { inheritAppConfig: true },
          );

          await app.startAllMicroservices();
          logger.log(`✅ NATS connected successfully to: ${process.env.NATS_URL}`);
          logger.log(`📢 Queue: notify-service`);
        } catch (natsError) {
          logger.warn(`⚠️ Failed to connect NATS microservice: ${natsError.message}. Continuing with HTTP only...`);
        }
      });
    } else {
      logger.warn('📵 NATS_URL not provided, running in HTTP-only mode');
    }
  } catch (error) {
    logger.error('Failed to start Notify Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
