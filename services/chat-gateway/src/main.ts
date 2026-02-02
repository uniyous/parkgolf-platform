import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';

class ChatIoAdapter extends IoAdapter {
  createIOServer(port: number, options?: ServerOptions) {
    return super.createIOServer(port, {
      ...options,
      pingInterval: 25000,
      pingTimeout: 60000,
      connectTimeout: 45000,
    });
  }
}

async function bootstrap() {
  const logger = new Logger('ChatGateway');

  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);
  logger.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'NOT SET'}`);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // WebSocket Adapter (custom ping/timeout for long-lived connections)
  app.useWebSocketAdapter(new ChatIoAdapter(app));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  const corsOrigins = process.env.CORS_ALLOWED_ORIGINS;
  app.enableCors({
    origin: corsOrigins
      ? corsOrigins.split(',').map(o => o.trim())
      : [
          'http://localhost:3002',
          'https://parkgolf-user.web.app',
          'https://parkgolf-user-dev.web.app',
          'https://dev-user.goparkmate.com',
          'https://user.goparkmate.com',
          'https://dev-api.goparkmate.com',
          'https://api.goparkmate.com',
        ],
    credentials: true,
  });

  const port = parseInt(process.env.PORT || '3095');
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Chat Gateway is running on port ${port}`);
  logger.log(`🔌 WebSocket available at: ws://0.0.0.0:${port}`);
  logger.log(`🩺 Health check: http://0.0.0.0:${port}/health`);
}

bootstrap().catch((error) => {
  const logger = new Logger('ChatGateway');
  logger.error('Failed to start Chat Gateway', error);
  process.exit(1);
});
