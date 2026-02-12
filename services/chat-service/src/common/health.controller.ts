import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from './prisma.service';
import { isNatsReady } from './readiness';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      service: 'chat-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReady(@Res() res: Response) {
    const nats = isNatsReady();
    let db = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch { /* DB unreachable — reported as not ready */ }

    const ready = nats && db;
    res.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: ready ? 'ready' : 'not_ready',
      nats,
      database: db,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('live')
  getLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
