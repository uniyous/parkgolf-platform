import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { UnifiedExceptionFilter } from './common/exceptions';
import { ResponseTransformInterceptor } from './common/interceptor/response-transform.interceptor';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

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

    // Start HTTP server first for Cloud Run health check
    const port = parseInt(process.env.PORT || '8080');
    await app.listen(port, '0.0.0.0');

    logger.log(`🚀 Auth Service is running on port ${port}`);
    logger.log(`🩺 Health check available at: http://0.0.0.0:${port}/health`);

    // Register global interceptor BEFORE connecting microservice
    app.useGlobalInterceptors(new ResponseTransformInterceptor());

    // Connect NATS microservice asynchronously (optional for Cloud Run)
    if (process.env.NATS_URL) {
      setImmediate(async () => {
        try {
          // inheritAppConfig: true - inherit global pipes, interceptors, guards, filters
          app.connectMicroservice<MicroserviceOptions>(
            {
              transport: Transport.NATS,
              options: {
                servers: [process.env.NATS_URL],
                queue: 'auth-service',
                reconnect: true,
                maxReconnectAttempts: 3,
                reconnectTimeWait: 2000,
              },
            },
            { inheritAppConfig: true },
          );

          await app.startAllMicroservices();
          logger.log(`🔗 NATS connected to: ${process.env.NATS_URL}`);
        } catch (natsError) {
          logger.warn('Failed to connect NATS microservice, continuing with HTTP only...', natsError.message);
        }
      });
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }

    logger.log(`📢 Queue: auth-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   [Auth] auth.user.login, auth.user.validate, auth.user.refresh, auth.user.me`);
    logger.log(`   [Auth] auth.admin.login, auth.admin.validate, auth.admin.refresh, auth.admin.me`);
    logger.log(`   [Users] users.list, users.getById, users.create, users.update, users.delete, users.resetPassword, users.updateRole, users.updatePermissions`);
    logger.log(`   [Users] users.updateStatus, users.stats, users.findByEmail, users.validateCredentials`);
    logger.log(`   [Admins] admins.list, admins.getById, admins.create, admins.update, admins.delete`);
    logger.log(`   [Admins] admins.updateStatus, admins.updatePermissions, admins.stats`);
    logger.log(`   [Permissions] permissions.list`);
  } catch (error) {
    logger.error('Failed to start Auth Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
