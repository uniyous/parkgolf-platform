import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

@ApiTags('Health')
@Controller('api/admin/health')
export class ApiHealthController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Health check (Ingress)' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'parkgolf-admin-api',
      version: '0.0.1',
      environment: this.configService.get('NODE_ENV'),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (Ingress)' })
  getReady() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check (Ingress)' })
  getLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
