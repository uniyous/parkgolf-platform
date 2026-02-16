import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('ChatService');

  const dbUrl = process.env.DATABASE_URL || '';
  const maskedDbUrl = dbUrl.replace(/:[^@]*@/, ':****@');
  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - DATABASE_URL: ${maskedDbUrl}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);

  try {
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    app.useGlobalFilters(new UnifiedExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    const corsOrigins = process.env.CORS_ALLOWED_ORIGINS;
    app.enableCors({
      origin: corsOrigins
        ? corsOrigins.split(',').map(o => o.trim())
        : [
            'http://localhost:3002',
            'https://parkgolf-user.web.app',
            'https://parkgolf-user-dev.web.app',
            'https://dev-api.parkgolfmate.com',
            'https://api.parkgolfmate.com',
          ],
      credentials: true,
    });

    // Graceful shutdown
    app.enableShutdownHooks();

    // Start HTTP server for health checks
    const DEFAULT_PORT = 3096;
    const port = parseInt(process.env.PORT || String(DEFAULT_PORT));
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Chat Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://0.0.0.0:${port}/health`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'chat-service', logger).catch(() => {});
    }

    logger.log(`📢 Queue: chat-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Rooms] chat.rooms.create, chat.rooms.get, chat.rooms.list, chat.rooms.addMember, chat.rooms.removeMember`);
    logger.log(`   [Messages] chat.messages.list, chat.messages.markRead, chat.messages.unreadCount, chat.messages.delete`);
    logger.log(`   [JetStream] CHAT_MESSAGES consumer: chat-service-messages`);
  } catch (error) {
    logger.error('Failed to start Chat Service', error);
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
  const logger = new Logger('ChatService');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
