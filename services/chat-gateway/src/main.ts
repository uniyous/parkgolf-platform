import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { connect, NatsConnection } from 'nats';
import { createNatsAdapter } from './adapters/nats-adapter';

class ChatIoAdapter extends IoAdapter {
  constructor(
    app: any,
    private readonly nc: NatsConnection | null,
  ) {
    super(app);
  }

  createIOServer(port: number, options?: ServerOptions) {
    const server = super.createIOServer(port, {
      ...options,
      pingInterval: 25000,
      pingTimeout: 60000,
      connectTimeout: 45000,
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2분간 상태 보존
        skipMiddlewares: true,
      },
    });

    // Apply NATS adapter for multi-replica support
    if (this.nc) {
      server.adapter(createNatsAdapter(this.nc));
    }

    return server;
  }
}

async function bootstrap() {
  const logger = new Logger('ChatGateway');

  logger.log(`Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);
  logger.log(`   - JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'NOT SET'}`);

  // 1. Adapter용 NATS 연결 (NatsService와 별도 — Socket.IO adapter 전용)
  let adapterNc: NatsConnection | null = null;
  const natsUrl = process.env.NATS_URL;
  if (natsUrl) {
    try {
      adapterNc = await connect({
        servers: [natsUrl],
        reconnect: true,
        maxReconnectAttempts: -1,
        reconnectTimeWait: 2000,
        name: 'chat-gateway-adapter',
      });
      logger.log(`NATS adapter connection established: ${natsUrl}`);
    } catch (error) {
      logger.warn(`Failed to connect NATS for adapter: ${error}. Running single-instance mode.`);
    }
  } else {
    logger.warn('NATS_URL not set. Running single-instance mode (no cross-pod broadcast).');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // 2. WebSocket Adapter with NATS for multi-replica
  app.useWebSocketAdapter(new ChatIoAdapter(app, adapterNc));

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

  // 3. Graceful shutdown
  app.enableShutdownHooks();
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received. Starting graceful shutdown...');
    if (adapterNc) {
      await adapterNc.drain().catch(() => {});
    }
    await app.close();
  });

  const port = parseInt(process.env.PORT || '3095');
  await app.listen(port, '0.0.0.0');

  logger.log(`Chat Gateway is running on port ${port}`);
  logger.log(`WebSocket available at: ws://0.0.0.0:${port}`);
  logger.log(`Health check: http://0.0.0.0:${port}/health`);
}

bootstrap().catch((error) => {
  const logger = new Logger('ChatGateway');
  logger.error('Failed to start Chat Gateway', error);
  process.exit(1);
});
