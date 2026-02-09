import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Log environment variables (masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedDbUrl = dbUrl.replace(/:[^@]*@/, ':****@');
  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - DATABASE_URL: ${maskedDbUrl}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);
  logger.log(`   - TOSS_API_URL: ${process.env.TOSS_API_URL}`);

  try {
    // Create HTTP app with minimal logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Global unified exception filter
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

    // CORS 설정
    app.enableCors({
      origin: [
        /^https:\/\/.*\.run\.app$/,
        /^https:\/\/.*\.tosspayments\.com$/,
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'toss-signature'],
      credentials: true,
    });

    // Start HTTP server
    const port = parseInt(process.env.PORT || '8086');
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Payment Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);
    logger.log(`💳 Webhook endpoint: http://0.0.0.0:${port}/webhooks/toss`);

    // Register global interceptor
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Connect NATS microservice (blocking - Pod must be ready before receiving traffic)
    if (process.env.NATS_URL) {
      try {
        app.connectMicroservice<MicroserviceOptions>(
          {
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_URL],
              queue: 'payment-service',
              reconnect: true,
              maxReconnectAttempts: -1,
              reconnectTimeWait: 2000,
            },
          },
          { inheritAppConfig: true },
        );

        await app.startAllMicroservices();
        setNatsReady(true);
        logger.log(`🔗 NATS connected to: ${process.env.NATS_URL}`);
      } catch (natsError) {
        logger.warn(
          'Failed to connect NATS microservice, continuing with HTTP only...',
          natsError.message,
        );
      }
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log(`📢 Queue: payment-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Payment] payment.create, payment.confirm, payment.cancel`);
    logger.log(`   [Payment] payment.get, payment.getByOrderId, payment.list`);
    logger.log(`   [Billing] billing.issueKey, billing.pay, billing.deleteKey`);
    logger.log(`   [Events] payment.approved, payment.cancelled, payment.failed`);
  } catch (error) {
    logger.error('Failed to start Payment Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
