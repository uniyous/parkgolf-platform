import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { NatsClientService } from '../nats/nats-client.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly configService: ConfigService,
    private readonly natsClient: NatsClientService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'parkgolf-user-api',
      version: '0.0.1',
      environment: this.configService.get('NODE_ENV'),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check - NATS' })
  getReady(@Res() res: Response) {
    const nats = this.natsClient.getConnectionStatus();
    res.status(nats ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE).json({
      status: nats ? 'ready' : 'not_ready',
      nats,
      timestamp: new Date().toISOString(),
    });
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  getLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
