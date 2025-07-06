import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // NATS Microservice setup
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.NATS,
      options: {
        servers: [configService.get<string>('NATS_URL') || 'nats://localhost:4222'],
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

    app.enableCors();

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('Park Golf Auth Service API')
    .setDescription('Authentication and user management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);

    const port = 3011;
    
    // Start all microservices
    await app.startAllMicroservices();
    await app.listen(port);
    
    logger.log(`🚀 Auth Service is running on port ${port}`);
    logger.log(`📡 NATS Microservice connected to auth-service queue`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
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
