import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

interface ServiceHealth {
  name: string;
  url: string;
  status: 'ok' | 'error';
  responseTime: number;
  message?: string;
}

interface WarmupResponse {
  success: boolean;
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    healthy: number;
    unhealthy: number;
    totalTime: number;
  };
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly services = [
    { name: 'auth-service', url: process.env.AUTH_SERVICE_URL || 'https://auth-service-dev-iihuzmuufa-du.a.run.app' },
    { name: 'user-api', url: process.env.USER_API_URL || 'https://user-api-dev-iihuzmuufa-du.a.run.app' },
    { name: 'course-service', url: process.env.COURSE_SERVICE_URL || 'https://course-service-dev-iihuzmuufa-du.a.run.app' },
    { name: 'booking-service', url: process.env.BOOKING_SERVICE_URL || 'https://booking-service-dev-iihuzmuufa-du.a.run.app' },
  ];

  constructor(private readonly configService: ConfigService) {}

  @Get()
  @ApiOperation({ summary: 'Health check' })
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
  @ApiOperation({ summary: 'Readiness check' })
  getReady() {
    return {
      status: 'ready',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness check' })
  getLive() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('warmup')
  @ApiOperation({ summary: 'Warm up all Cloud Run services' })
  @ApiResponse({ status: 200, description: 'All services warmed up' })
  async warmupServices(): Promise<WarmupResponse> {
    const startTime = Date.now();

    // 모든 서비스에 병렬로 health 요청
    const results = await Promise.allSettled(
      this.services.map(async (service) => {
        const serviceStart = Date.now();
        try {
          const response = await fetch(`${service.url}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000), // 30초 타임아웃
          });
          const responseTime = Date.now() - serviceStart;

          if (response.ok) {
            return {
              name: service.name,
              url: service.url,
              status: 'ok' as const,
              responseTime,
            };
          } else {
            return {
              name: service.name,
              url: service.url,
              status: 'error' as const,
              responseTime,
              message: `HTTP ${response.status}`,
            };
          }
        } catch (error) {
          const responseTime = Date.now() - serviceStart;
          return {
            name: service.name,
            url: service.url,
            status: 'error' as const,
            responseTime,
            message: error instanceof Error ? error.message : 'Unknown error',
          };
        }
      })
    );

    // 결과 정리
    const services: ServiceHealth[] = results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        name: 'unknown',
        url: 'unknown',
        status: 'error' as const,
        responseTime: 0,
        message: 'Promise rejected',
      };
    });

    const healthy = services.filter((s) => s.status === 'ok').length;
    const totalTime = Date.now() - startTime;

    return {
      success: healthy === services.length,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: services.length,
        healthy,
        unhealthy: services.length - healthy,
        totalTime,
      },
    };
  }
}