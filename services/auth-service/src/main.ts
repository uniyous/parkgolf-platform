import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
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

    await app.listen();
    
    logger.log(`🚀 Auth Service (NATS Microservice) is running`);
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
