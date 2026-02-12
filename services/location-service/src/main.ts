import { NestFactory } from '@nestjs/core';
import { INestApplication } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { UnifiedExceptionFilter } from './common/exceptions';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('LocationService');

  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new UnifiedExceptionFilter());
  app.useGlobalInterceptors(new ResponseTransformInterceptor());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  // HTTP 먼저 시작 (health check 가능하도록)
  const port = process.env.PORT || 8089;
  await app.listen(port);
  logger.log(`Location Service running on port ${port}`);

  // NATS 마이크로서비스 연결 (백그라운드 재시도)
  const natsUrl = process.env.NATS_URL;
  if (natsUrl) {
    connectNatsWithRetry(app, natsUrl, 'location-service', logger).catch(() => {});
  } else {
    logger.warn('NATS_URL not set. Running with HTTP only.');
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
  const logger = new Logger('LocationService');
  logger.error('Failed to start Location Service', error);
  process.exit(1);
});
