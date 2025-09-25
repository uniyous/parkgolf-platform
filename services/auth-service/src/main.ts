import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create HTTP app first for health check
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Add health check endpoint for Cloud Run
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', service: 'auth-service' });
    });

    // Connect NATS microservice
    const microservice = app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: [process.env.NATS_URL || 'nats://localhost:4222'],
        queue: 'auth-service',
        reconnect: true,
        maxReconnectAttempts: 5,
        reconnectTimeWait: 1000,
      },
    });

    // Global exception filter
    app.useGlobalFilters(new BaseExceptionFilter());

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

    // Start all microservices
    await app.startAllMicroservices();

    // Start HTTP server for health check
    const port = configService.get<number>('PORT') || 8080;
    await app.listen(port);

    logger.log(`🚀 Auth Service (NATS Microservice + HTTP Health Check) is running on port ${port}`);
    logger.log(`🩺 Health check: http://localhost:${port}/health`);
    logger.log(`🔗 NATS connected to: ${process.env.NATS_URL || 'nats://localhost:4222'}`);
    logger.log(`📢 Queue: auth-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   - auth.login, auth.validate, auth.refresh`);
    logger.log(`   - users.create, users.list, users.findById, users.update, users.delete`);
    logger.log(`   - auth.admin.*, auth.permission.*`);
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
