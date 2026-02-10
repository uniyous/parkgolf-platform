import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';
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

    // Graceful shutdown
    app.enableShutdownHooks();

    // Start HTTP server
    const port = parseInt(process.env.PORT || '8086');
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Payment Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);
    logger.log(`💳 Webhook endpoint: http://0.0.0.0:${port}/webhooks/toss`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'payment-service', logger).catch(() => {});
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

const NATS_MAX_ATTEMPTS = 50;
const NATS_BASE_DELAY_MS = 2000;
const NATS_MAX_DELAY_MS = 15000;
const NATS_MAX_BACKOFF_EXPONENT = 3;

async function connectNatsWithRetry(
  app: INestApplication, natsUrl: string, queue: string, logger: Logger,
) {
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: [natsUrl],
        queue,
        reconnect: true,
        reconnectTimeWait: NATS_BASE_DELAY_MS,
        maxReconnectAttempts: -1,
      },
    },
    { inheritAppConfig: true },
  );

  for (let attempt = 1; attempt <= NATS_MAX_ATTEMPTS; attempt++) {
    try {
      await app.startAllMicroservices();
      setNatsReady(true);
      logger.log(`NATS connected to ${natsUrl} (attempt ${attempt})`);
      return;
    } catch (error: unknown) {
      if (attempt === NATS_MAX_ATTEMPTS) {
        logger.error(`NATS failed after ${NATS_MAX_ATTEMPTS} attempts`);
        return;
      }
      const delay = Math.min(
        NATS_BASE_DELAY_MS * 2 ** Math.min(attempt - 1, NATS_MAX_BACKOFF_EXPONENT),
        NATS_MAX_DELAY_MS,
      );
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`NATS attempt ${attempt}/${NATS_MAX_ATTEMPTS}: ${message}. Retry in ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
