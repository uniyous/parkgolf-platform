import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('WeatherService');

  // HTTP 서버 (Health Check용)
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // NATS 마이크로서비스 연결
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: [natsUrl],
        queue: 'weather-service',
        reconnect: true,
        reconnectTimeWait: 1000,
        maxReconnectAttempts: -1,
      },
    },
    { inheritAppConfig: true },
  );

  await app.startAllMicroservices();
  logger.log(`NATS Microservice connected to ${natsUrl}`);

  const port = process.env.PORT || 8087;
  await app.listen(port);
  logger.log(`Weather Service running on port ${port}`);
}

bootstrap();
