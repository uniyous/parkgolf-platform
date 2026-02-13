import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.connectWithRetry(3, 2000);
  }

  private async connectWithRetry(maxRetries: number, delayMs: number) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const connectPromise = this.$connect();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Database connection timeout (15s)')), 15000),
        );
        await Promise.race([connectPromise, timeoutPromise]);
        this.logger.log('Database connected');
        return;
      } catch (error) {
        this.logger.warn(`DB connection attempt ${attempt}/${maxRetries} failed: ${error.message}`);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, delayMs));
        }
      }
    }
    this.logger.warn('DB connection failed after retries, continuing in limited mode');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
