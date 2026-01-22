import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Don't block startup if database is not available
    try {
      // Set a timeout for database connection
      const connectPromise = this.$connect();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      );

      await Promise.race([connectPromise, timeoutPromise]);
      this.logger.log('🗄️  Database connected for parkgolf-iam-service');
    } catch (error) {
      this.logger.warn('⚠️  Database connection failed, service will run in limited mode');
      this.logger.warn(`Error: ${error.message}`);
      // Don't throw - let the service start without database
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
