import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { isNatsReady } from '../readiness';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      service: 'weather-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReady(@Res() res: Response) {
    const nats = isNatsReady();
    res.status(nats ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: nats ? 'ready' : 'not_ready',
      nats,
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
