import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
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
            'https://dev-api.goparkmate.com',
            'https://api.goparkmate.com',
          ],
      credentials: true,
    });

    // Graceful shutdown
    app.enableShutdownHooks();

    // Start HTTP server for health checks
    const port = parseInt(process.env.PORT || '3096');
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
  const logger = new Logger('ChatService');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
