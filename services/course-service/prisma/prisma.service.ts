import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
    });
  }

  async onModuleInit() {
    const startTime = Date.now();
    await this.$connect();
    this.logger.log(`🗄️  Database connected for parkgolf-course-service in ${Date.now() - startTime}ms`);
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
