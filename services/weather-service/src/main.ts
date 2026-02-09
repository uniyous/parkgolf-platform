import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { UnifiedExceptionFilter } from './common/exceptions';
import { setNatsReady } from './common/readiness';

async function bootstrap() {
  const logger = new Logger('WeatherService');

  // HTTP 서버 (Health Check용)
  const app = await NestFactory.create(AppModule);

  // Global unified exception filter (handles both HTTP and RPC)
  app.useGlobalFilters(new UnifiedExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Graceful shutdown
  app.enableShutdownHooks();

  // HTTP 먼저 시작 (health check 가능하도록)
  const port = process.env.PORT || 8087;
  await app.listen(port);
  logger.log(`Weather Service running on port ${port}`);

  // NATS 마이크로서비스 연결 (실패해도 HTTP는 유지)
  const natsUrl = process.env.NATS_URL;
  if (natsUrl) {
    try {
      app.connectMicroservice<MicroserviceOptions>(
        {
          transport: Transport.NATS,
          options: {
            servers: [natsUrl],
            queue: 'weather-service',
            reconnect: true,
            reconnectTimeWait: 2000,
            maxReconnectAttempts: -1,
          },
        },
        { inheritAppConfig: true },
      );

      await app.startAllMicroservices();
      setNatsReady(true);
      logger.log(`NATS Microservice connected to ${natsUrl}`);
    } catch (error: any) {
      logger.warn(`Failed to connect NATS: ${error.message}. Continuing with HTTP only.`);
    }
  } else {
    logger.warn('NATS_URL not set. Running with HTTP only.');
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('WeatherService');
  logger.error('Failed to start Weather Service', error);
  process.exit(1);
});
