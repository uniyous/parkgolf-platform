import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GlobalRpcExceptionFilter } from './common/exception/rpc-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting Course Service...');

    // Create HTTP app first for health check
    logger.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Add health check endpoint for Cloud Run
    logger.log('🏥 Setting up health check endpoint...');
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'course-service',
        timestamp: new Date().toISOString()
      });
    });

    // Global pipes for validation
    logger.log('🔧 Setting up global validation pipes...');
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

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    logger.log(`🌐 Starting HTTP server on port ${port}...`);
    logger.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Course Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://localhost:${port}/health`);

    // Connect NATS microservice asynchronously (optional for Cloud Run)
    if (process.env.NATS_URL) {
      logger.log(`📡 NATS_URL found: ${process.env.NATS_URL}`);
      setImmediate(async () => {
        try {
          logger.log('🔗 Attempting NATS connection...');
          const microservice = app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_URL],
              queue: 'course-service',
              reconnect: true,
              maxReconnectAttempts: 3,
              reconnectTimeWait: 2000,
            },
          });

          // Global filters for microservice
          app.useGlobalFilters(new GlobalRpcExceptionFilter());

          await app.startAllMicroservices();
          logger.log(`✅ NATS connected successfully to: ${process.env.NATS_URL}`);
          logger.log(`📢 Queue: course-service`);
        } catch (natsError) {
          logger.warn(`⚠️ Failed to connect NATS microservice: ${natsError.message}. Continuing with HTTP only...`);
        }
      });
    } else {
      logger.warn('📵 NATS_URL not provided, running in HTTP-only mode');
    }
  } catch (error) {
    logger.error('Failed to start Course Service microservice', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
