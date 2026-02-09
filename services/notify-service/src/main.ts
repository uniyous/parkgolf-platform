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

    // Graceful shutdown
    app.enableShutdownHooks();

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    logger.log(`🌐 Starting HTTP server on port ${port}...`);
    logger.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Notify Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://localhost:${port}/health`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'notify-service', logger).catch(() => {});
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }
  } catch (error) {
    logger.error('Failed to start Notify Service', error);
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
