import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    logger.log('🚀 Starting Course Service...');

    // Create HTTP app first for health check
    logger.log('📦 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);

    // Global unified exception filter (handles both HTTP and RPC)
    app.useGlobalFilters(new UnifiedExceptionFilter());

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

    // CORS 설정 (내부 서비스 간 통신용 - 프론트엔드는 BFF를 통해 접근)
    app.enableCors({
      origin: [
        /^https:\/\/.*\.run\.app$/,  // Cloud Run 내부 서비스
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    });

    // Graceful shutdown
    app.enableShutdownHooks();

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    logger.log(`🌐 Starting HTTP server on port ${port}...`);
    logger.log(`🔧 Environment: NODE_ENV=${process.env.NODE_ENV}, PORT=${process.env.PORT}`);
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Course Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://localhost:${port}/health`);

    // Register global interceptor BEFORE connecting microservice
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'course-service', logger).catch(() => {});
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }
  } catch (error) {
    logger.error('Failed to start Course Service microservice', error);
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
