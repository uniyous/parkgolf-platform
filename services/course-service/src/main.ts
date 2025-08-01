import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { GlobalRpcExceptionFilter } from './common/exception/rpc-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create NATS microservice only (no HTTP server)
    const configService = new ConfigService();
    const natsUrl = configService.get<string>('NATS_URL') || 'nats://localhost:4222';
    
    const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.NATS,
      options: {
        servers: [natsUrl],
        queue: 'course-service',
        reconnect: true,
        maxReconnectAttempts: 5,
        reconnectTimeWait: 1000,
      },
    });

    // Global filters for microservice
    app.useGlobalFilters(new GlobalRpcExceptionFilter());

    // Global pipes for validation
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
    
    logger.log(`🚀 Course Service (NATS Microservice) is running`);
    logger.log(`🔗 NATS connected to: ${natsUrl}`);
    logger.log(`📢 Queue: course-service`);
    logger.log(`💬 Available message patterns:`);
    logger.log(`   - courses.list, courses.findById, courses.create, courses.update, courses.delete`);
    logger.log(`   - holes.list, holes.findById, holes.create, holes.update, holes.delete, holes.findByCourse`);
    logger.log(`   - timeSlots.list, timeSlots.create, timeSlots.update, timeSlots.delete, timeSlots.stats, timeSlots.findByCourse`);
    logger.log(`   - companies.list, companies.findById, companies.create, companies.update, companies.delete`);
  } catch (error) {
    logger.error('Failed to start Course Service microservice', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  const logger = new Logger('Bootstrap');
  logger.error('Unhandled error during bootstrap', error);
  process.exit(1);
});
