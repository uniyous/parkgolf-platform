import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { BaseExceptionFilter } from './common/exception/base-exception.filter';
import { GlobalRpcExceptionFilter } from './common/exception/rpc-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

    // Global exception filter
    app.useGlobalFilters(new BaseExceptionFilter());

    // NATS microservice setup
    const natsUrl = configService.get<string>('NATS_URL') || 'nats://localhost:4222';
    
    try {
      const microservice = app.connectMicroservice<MicroserviceOptions>({
        transport: Transport.NATS,
        options: {
          servers: [natsUrl],
          queue: 'booking-service',
          reconnect: true,
          maxReconnectAttempts: 5,
          reconnectTimeWait: 1000,
        },
      });

      microservice.useGlobalFilters(new GlobalRpcExceptionFilter());
    } catch (error) {
      logger.warn('Failed to connect to NATS, continuing without microservice', error.message);
    }

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

    const config = new DocumentBuilder()
      .setTitle('Park Golf Booking Service API')
      .setDescription('Booking management API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    await app.startAllMicroservices();

    const port = configService.get<number>('PORT') || 3013;
    await app.listen(port);
    
    logger.log(`🚀 Booking Service is running on port ${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);
    logger.log(`🔗 NATS microservice connected to: ${natsUrl}`);
  } catch (error) {
    logger.error('Failed to start Booking Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
