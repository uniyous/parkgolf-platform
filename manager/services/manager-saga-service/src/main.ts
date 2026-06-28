import './common/observability/tracing';
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
    logger.log('Starting Manager Saga Service...');

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
      .setTitle('Parkgolf Manager Saga Service API')
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

    logger.log(`Manager Saga Service is running on port ${port}`);
    logger.log(`Health check: http://localhost:${port}/health`);
    logger.log(`Swagger docs: http://localhost:${port}/api-docs`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'manager-saga-service', logger).catch(() => {});
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log('=== Registered Saga Definitions ===');
    logger.log('  [Saga] CREATE_DESK_BOOKING : frontdesk.create → slot.reserve → payment.collect(수납) → confirm → notification');
    logger.log('  [Saga] KIOSK_CHECKIN       : kiosk.checkin → slot.reserve → payment.collect(수납) → confirm');
    logger.log('=== NATS Patterns ===');
    logger.log('  [Trigger] saga.deskbooking.create / saga.kiosk.checkin');
    logger.log('  [Admin]   manager.saga.list / manager.saga.get / manager.saga.retry / manager.saga.resolve / manager.saga.stats');
  } catch (error) {
    logger.error('Failed to start Manager Saga Service', error);
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
