import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const logger = new Logger('ChatGateway');

  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);
  logger.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'NOT SET'}`);

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // WebSocket Adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // CORS
  app.enableCors({
    origin: [
      'http://localhost:3002', // user-app-web
      'http://localhost:19006', // iOS Expo (if used)
      /^https:\/\/.*\.run\.app$/,
      'https://parkgolf-user.web.app',
      'https://parkgolf-user-dev.web.app',
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
