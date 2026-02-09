import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { NatsService } from '../nats/nats.service';

@Controller('health')
export class HealthController {
  constructor(private readonly natsService: NatsService) {}

  @Get()
  check() {
    return {
      status: 'ok',
      service: 'chat-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  getReady(@Res() res: Response) {
    const nats = this.natsService.isConnected();
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
