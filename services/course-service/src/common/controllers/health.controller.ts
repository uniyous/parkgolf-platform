import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { PrismaService } from '../../../prisma/prisma.service';
import { isNatsReady } from '../readiness';

@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'parkgolf-course-service',
      version: '0.0.1',
      environment: this.configService.get('NODE_ENV'),
    };
  }

  @Get('ready')
  async getReady(@Res() res: Response) {
    const nats = isNatsReady();
    let db = false;

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      db = true;
    } catch {}

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
