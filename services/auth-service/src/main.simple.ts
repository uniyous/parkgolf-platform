import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    // Create simple HTTP app
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Add health check endpoint
    app.getHttpAdapter().get('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        service: 'auth-service',
        timestamp: new Date().toISOString()
      });
    });

    // Get port from environment
    const port = process.env.PORT || '8080';

    // Listen on all interfaces
    await app.listen(parseInt(port), '0.0.0.0');

    logger.log(`Auth Service started on port ${port}`);
    logger.log(`Health check: http://0.0.0.0:${port}/health`);

  } catch (error) {
    logger.error('Failed to start service', error);
    process.exit(1);
  }
}

bootstrap();