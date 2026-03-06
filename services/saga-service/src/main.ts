import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('Starting Saga Service...');

    const app = await NestFactory.create(AppModule);

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

    const config = new DocumentBuilder()
      .setTitle('Parkgolf Saga Service API')
      .setDescription('Saga Orchestrator - distributed transaction management')
      .setVersion('1.0')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    app.enableShutdownHooks();

    const port = parseInt(process.env.PORT || '8080');
    logger.log(`Starting HTTP server on port ${port}...`);
    logger.log(`Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    await app.listen(port, '0.0.0.0');

    logger.log(`Saga Service is running on port ${port}`);
    logger.log(`Health check: http://localhost:${port}/health`);
    logger.log(`Swagger docs: http://localhost:${port}/api-docs`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'saga-service', logger).catch(() => {});
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log('=== Registered Saga Definitions ===');
    logger.log('  [Saga] CREATE_BOOKING    : booking.create → slot.reserve → status update → notification');
    logger.log('  [Saga] CANCEL_BOOKING    : policy check → cancel → payment refund → slot release → notification');
    logger.log('  [Saga] ADMIN_REFUND      : policy check → admin cancel → payment refund → slot release → finalize → notification');
    logger.log('  [Saga] PAYMENT_CONFIRMED : confirm booking → notification → company member');
    logger.log('  [Saga] PAYMENT_TIMEOUT   : mark failed → slot release → notification');
    logger.log('=== NATS Patterns ===');
    logger.log('  [Trigger] saga.booking.create / saga.booking.cancel / saga.booking.adminRefund');
    logger.log('  [Event]   booking.paymentConfirmed');
    logger.log('  [Admin]   saga.list / saga.get / saga.retry / saga.resolve / saga.stats');
  } catch (error) {
    logger.error('Failed to start Saga Service', error);
    process.exit(1);
  }
}

async function connectNatsWithRetry(
  app: INestApplication, natsUrl: string, queue: string, logger: Logger,
) {
  const MAX_ATTEMPTS = 50;
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: [natsUrl],
        queue,
        reconnect: true,
        reconnectTimeWait: 2000,
        maxReconnectAttempts: -1,
      },
    },
    { inheritAppConfig: true },
  );

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await app.startAllMicroservices();
      setNatsReady(true);
      logger.log(`NATS connected to ${natsUrl} (attempt ${attempt})`);
      return;
    } catch (error: any) {
      if (attempt === MAX_ATTEMPTS) {
        logger.error(`NATS failed after ${MAX_ATTEMPTS} attempts`);
        return;
      }
      const delay = Math.min(2000 * 2 ** Math.min(attempt - 1, 3), 15000);
      logger.warn(`NATS attempt ${attempt}/${MAX_ATTEMPTS}: ${error.message}. Retry in ${delay / 1000}s`);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
