import { Controller, Get, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WarmupService, WarmupResult } from '../services/warmup.service';

@ApiTags('System')
@Controller('system')
export class WarmupController {
  private readonly logger = new Logger(WarmupController.name);

  constructor(private readonly warmupService: WarmupService) {}

  @Get('warmup')
  @ApiOperation({
    summary: 'Warm up all services',
    description:
      '모든 Cloud Run 서비스를 웜업합니다. HTTP health check로 Cold Start를 트리거하고, NATS ping으로 마이크로서비스 통신을 확인합니다.',
  })
  @ApiResponse({
    status: 200,
    description: 'Warmup completed',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', description: '모든 서비스가 정상인지 여부' },
        timestamp: { type: 'string', format: 'date-time' },
        natsConnected: { type: 'boolean', description: 'NATS 연결 상태' },
        services: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              httpStatus: { type: 'string', enum: ['ok', 'error', 'skipped'] },
              httpResponseTime: { type: 'number' },
              natsStatus: { type: 'string', enum: ['ok', 'error', 'skipped'] },
              natsResponseTime: { type: 'number' },
            },
          },
        },
        summary: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            httpHealthy: { type: 'number' },
            natsHealthy: { type: 'number' },
            fullyHealthy: { type: 'number' },
            totalTime: { type: 'number' },
          },
        },
      },
    },
  })
  async warmupAll(): Promise<WarmupResult> {
    this.logger.log('Warmup request received');
    return this.warmupService.warmupAll();
  }

  @Get('warmup/http')
  @ApiOperation({
    summary: 'HTTP-only warmup',
    description:
      'HTTP health check만 수행합니다. Cold Start 트리거 전용으로 빠르게 실행됩니다.',
  })
  @ApiResponse({ status: 200, description: 'HTTP warmup completed' })
  async warmupHttpOnly(): Promise<WarmupResult> {
    this.logger.log('HTTP-only warmup request received');
    return this.warmupService.warmupHttpOnly();
  }

  @Get('warmup/nats')
  @ApiOperation({
    summary: 'NATS connectivity check',
    description: 'NATS 통신 연결 상태만 확인합니다. 모든 마이크로서비스에 ping을 보냅니다.',
  })
  @ApiResponse({ status: 200, description: 'NATS connectivity check completed' })
  async checkNatsConnectivity(): Promise<WarmupResult> {
    this.logger.log('NATS connectivity check request received');
    return this.warmupService.checkNatsConnectivity();
  }

  @Get('status')
  @ApiOperation({
    summary: 'Quick system status',
    description: 'admin-api 자체 상태와 기본 정보를 반환합니다.',
  })
  @ApiResponse({ status: 200, description: 'System status' })
  getStatus() {
    return {
      status: 'ok',
      service: 'admin-api',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };
  }
}
