import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { connect, NatsConnection } from 'nats';
import { createNatsAdapter } from './adapters/nats-adapter';
import { getCorsConfig } from './common/cors.config';

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
  //    NATS가 아직 준비되지 않았을 수 있으므로 재시도 로직 포함
  let adapterNc: NatsConnection | null = null;
  const natsUrl = process.env.NATS_URL;
  if (natsUrl) {
    const maxRetries = 10;
    const retryDelay = 3000; // 3초
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        adapterNc = await connect({
          servers: [natsUrl],
          reconnect: true,
          maxReconnectAttempts: -1,
          reconnectTimeWait: 2000,
          name: 'chat-gateway-adapter',
        });
        logger.log(`NATS adapter connection established: ${natsUrl}`);
        break;
      } catch (error) {
        if (attempt < maxRetries) {
          logger.warn(`NATS adapter connection attempt ${attempt}/${maxRetries} failed: ${error}. Retrying in ${retryDelay / 1000}s...`);
          await new Promise((r) => setTimeout(r, retryDelay));
        } else {
          logger.error(`NATS adapter connection failed after ${maxRetries} attempts. Running single-instance mode (no cross-pod broadcast).`);
        }
      }
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
  app.enableCors(getCorsConfig());

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
