import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { GlobalRpcExceptionFilter } from './common/exception/rpc-exception.filter';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Log environment variables (masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedDbUrl = dbUrl.replace(/:[^@]*@/, ':****@');
  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - DATABASE_URL: ${maskedDbUrl}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);

  try {
    // Create HTTP app with minimal logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Global exception filter
    app.useGlobalFilters(new BaseExceptionFilter());

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
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Booking Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);

    // Register global interceptor for microservice BEFORE connecting
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Connect NATS microservice asynchronously (optional for Cloud Run)
    if (process.env.NATS_URL) {
      setImmediate(async () => {
        try {
          const microservice = app.connectMicroservice<MicroserviceOptions>({
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_URL],
              queue: 'booking-service',
              reconnect: true,
              maxReconnectAttempts: 3,
              reconnectTimeWait: 2000,
            },
          });

          // Global filters for microservice
          app.useGlobalFilters(new GlobalRpcExceptionFilter());

          await app.startAllMicroservices();
          logger.log(`🔗 NATS connected to: ${process.env.NATS_URL}`);
        } catch (natsError) {
          logger.warn('Failed to connect NATS microservice, continuing with HTTP only...', natsError.message);
        }
      });
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log(`📢 Queue: booking-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Booking] booking.create, booking.get, booking.update, booking.cancel`);
    logger.log(`   [Booking] booking.search, booking.getByUser, booking.getByNumber`);
    logger.log(`   [TimeSlot] timeslot.availability, timeslot.check`);
    logger.log(`   [Course] course.cache.sync`);
  } catch (error) {
    logger.error('Failed to start Booking Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
