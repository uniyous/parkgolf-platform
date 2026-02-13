import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication, ValidationPipe, Logger } from '@nestjs/common';
import { UnifiedExceptionFilter } from './common/exceptions';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Log environment variables (masked)
  const dbUrl = process.env.DATABASE_URL || '';
  const maskedDbUrl = dbUrl.replace(/:[^@]*@/, ':****@');
  logger.log(`🔧 Environment Variables:`);
  logger.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);
  logger.log(`   - DATABASE_URL: ${maskedDbUrl}`);
  logger.log(`   - NATS_URL: ${process.env.NATS_URL}`);

  try {
    // Create HTTP app with minimal logging
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

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
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 IAM Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);

    // NATS 마이크로서비스 연결 (백그라운드 재시도)
    if (process.env.NATS_URL) {
      connectNatsWithRetry(app, process.env.NATS_URL, 'iam-service', logger).catch(() => {});
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log(`📢 Queue: iam-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Auth] iam.auth.user.login, iam.auth.user.validate, iam.auth.user.refresh, iam.auth.user.me`);
    logger.log(`   [Auth] iam.auth.admin.login, iam.auth.admin.validate, iam.auth.admin.refresh, iam.auth.admin.me`);
    logger.log(`   [Users] iam.users.list, iam.users.getById, iam.users.create, iam.users.update, iam.users.delete`);
    logger.log(`   [Users] iam.users.updateStatus, iam.users.stats, iam.users.findByEmail, iam.users.validateCredentials`);
    logger.log(`   [Admins] iam.admins.list, iam.admins.getById, iam.admins.create, iam.admins.update, iam.admins.delete`);
    logger.log(`   [Admins] iam.admins.updateStatus, iam.admins.updatePermissions, iam.admins.stats`);
    logger.log(`   [Permissions] iam.permissions.list`);
    logger.log(`   [Roles] iam.roles.list, iam.roles.permissions, iam.roles.withPermissions`);
    logger.log(`   [Companies] iam.companies.list, iam.companies.getById, iam.companies.create, iam.companies.update, iam.companies.delete`);
    logger.log(`   [Menu] iam.menu.getByAdmin`);
  } catch (error) {
    logger.error('Failed to start IAM Service', error);
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
