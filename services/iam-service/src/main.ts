import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { UnifiedExceptionFilter } from './common/exceptions';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';
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

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 IAM Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);

    // Register global interceptor BEFORE connecting microservice
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Connect NATS microservice (blocking - Pod must be ready before receiving traffic)
    if (process.env.NATS_URL) {
      try {
        app.connectMicroservice<MicroserviceOptions>(
          {
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_URL],
              queue: 'iam-service',
              reconnect: true,
              maxReconnectAttempts: -1,
              reconnectTimeWait: 2000,
            },
          },
          { inheritAppConfig: true },
        );

        await app.startAllMicroservices();
        setNatsReady(true);
        logger.log(`🔗 NATS connected to: ${process.env.NATS_URL}`);
      } catch (natsError) {
        logger.warn('Failed to connect NATS microservice, continuing with HTTP only...', natsError.message);
      }
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
  } catch (error) {
    logger.error('Failed to start IAM Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
