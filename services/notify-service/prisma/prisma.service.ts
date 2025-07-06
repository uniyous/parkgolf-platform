import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    console.log('🗄️  Database connected for parkgolf-notify-service');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
