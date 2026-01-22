import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

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

    app.enableCors({
      origin: true,
      credentials: true,
    });

    // Start HTTP server for health checks
    const port = parseInt(process.env.PORT || '3096');
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Chat Service is running on port ${port}`);
    logger.log(`🩺 Health check: http://0.0.0.0:${port}/health`);

    // Connect NATS microservice
    if (process.env.NATS_URL) {
      setImmediate(async () => {
        try {
          app.connectMicroservice<MicroserviceOptions>(
            {
              transport: Transport.NATS,
              options: {
                servers: [process.env.NATS_URL!],
                queue: 'chat-service',
                reconnect: true,
                maxReconnectAttempts: 3,
                reconnectTimeWait: 2000,
              },
            },
            { inheritAppConfig: true },
          );

          await app.startAllMicroservices();
          logger.log(`🔗 NATS connected to: ${process.env.NATS_URL}`);
        } catch (natsError: any) {
          logger.warn('Failed to connect NATS, continuing with HTTP only...', natsError.message);
        }
      });
    }

    logger.log(`📢 Queue: chat-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Rooms] chat.rooms.create, chat.rooms.get, chat.rooms.list, chat.rooms.addMember, chat.rooms.removeMember`);
    logger.log(`   [Messages] chat.messages.save, chat.messages.list, chat.messages.markRead`);
  } catch (error) {
    logger.error('Failed to start Chat Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('ChatService');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
