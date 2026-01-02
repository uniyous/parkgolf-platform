import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { UnifiedExceptionFilter } from './common/exceptions';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);

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

    app.enableCors();

    // Swagger 설정
    const config = new DocumentBuilder()
      .setTitle('Parkgolf Notify Service API')
      .setDescription('API documentation for parkgolf-notify-service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);

    // Start HTTP server first
    const port = configService.get<number>('PORT') || 3014;
    await app.listen(port);

    const serviceName = 'parkgolf-notify-service';
    logger.log(`🚀 ${serviceName} is running on port ${port}`);
    logger.log(`📚 Swagger docs: http://localhost:${port}/api-docs`);

    // Connect NATS microservice asynchronously
    const natsUrl = configService.get<string>('NATS_URL');
    if (natsUrl) {
      setImmediate(async () => {
        try {
          // inheritAppConfig: true - inherit global pipes, interceptors, guards, filters
          app.connectMicroservice<MicroserviceOptions>(
            {
              transport: Transport.NATS,
              options: {
                servers: [natsUrl],
                queue: 'notify-service',
                reconnect: true,
                maxReconnectAttempts: 5,
                reconnectTimeWait: 1000,
              },
            },
            { inheritAppConfig: true },
          );

          await app.startAllMicroservices();
          logger.log(`🔗 NATS connected to: ${natsUrl}`);
        } catch (natsError) {
          logger.warn(`Failed to connect NATS microservice: ${natsError.message}. Continuing with HTTP only...`);
        }
      });
    } else {
      logger.warn('NATS_URL not provided, running in HTTP-only mode');
    }
  } catch (error) {
    logger.error('Failed to start Notify Service', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
