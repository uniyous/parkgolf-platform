import { Injectable, Logger } from '@nestjs/common';
import { NatsClientService, NATS_TIMEOUTS } from '../nats/nats-client.service';

export interface ServiceHealth {
  name: string;
  httpStatus: 'ok' | 'error' | 'skipped';
  httpResponseTime?: number;
  httpMessage?: string;
  natsStatus: 'ok' | 'error' | 'skipped';
  natsResponseTime?: number;
  natsMessage?: string;
}

export interface WarmupResult {
  success: boolean;
  timestamp: string;
  services: ServiceHealth[];
  summary: {
    total: number;
    httpHealthy: number;
    natsHealthy: number;
    fullyHealthy: number;
    totalTime: number;
  };
  natsConnected: boolean;
}

interface ServiceConfig {
  name: string;
  httpUrl: string;
  natsPattern?: string; // Optional - HTTP-only BFF services don't have NATS
  isNatsService: boolean;
}

@Injectable()
export class WarmupService {
  private readonly logger = new Logger(WarmupService.name);

  private readonly services: ServiceConfig[] = [
    {
      name: 'auth-service',
      httpUrl: process.env.AUTH_SERVICE_URL || 'https://auth-service-dev-iihuzmuufa-du.a.run.app',
      natsPattern: 'auth.ping',
      isNatsService: true,
    },
    {
      name: 'user-api',
      httpUrl: process.env.USER_API_URL || 'https://user-api-dev-iihuzmuufa-du.a.run.app',
      isNatsService: false, // HTTP-only BFF
    },
    {
      name: 'course-service',
      httpUrl: process.env.COURSE_SERVICE_URL || 'https://course-service-dev-iihuzmuufa-du.a.run.app',
      natsPattern: 'course.ping',
      isNatsService: true,
    },
    {
      name: 'booking-service',
      httpUrl: process.env.BOOKING_SERVICE_URL || 'https://booking-service-dev-iihuzmuufa-du.a.run.app',
      natsPattern: 'booking.ping',
      isNatsService: true,
    },
  ];

  constructor(private readonly natsClient: NatsClientService) {}

  /**
   * 전체 시스템 웜업 수행
   * 1. HTTP health check로 Cloud Run cold start 트리거
   * 2. NATS ping으로 마이크로서비스 통신 확인
   */
  async warmupAll(): Promise<WarmupResult> {
    const startTime = Date.now();
    this.logger.log('Starting system warmup...');

    // Phase 1: HTTP Health Checks (병렬 실행)
    this.logger.log('Phase 1: HTTP Health Checks');
    const httpResults = await this.performHttpHealthChecks();

    // Phase 2: NATS Ping Checks (병렬 실행)
    this.logger.log('Phase 2: NATS Ping Checks');
    const natsResults = await this.performNatsPingChecks();

    // 결과 병합
    const services: ServiceHealth[] = this.services.map((service, index) => ({
      name: service.name,
      ...httpResults[index],
      ...natsResults[index],
    }));

    const httpHealthy = services.filter((s) => s.httpStatus === 'ok').length;
    const natsHealthy = services.filter((s) => s.natsStatus === 'ok').length;
    // HTTP-only 서비스는 NATS가 skipped이면 fully healthy로 처리
    const fullyHealthy = services.filter(
      (s) => s.httpStatus === 'ok' && (s.natsStatus === 'ok' || s.natsStatus === 'skipped'),
    ).length;

    const totalTime = Date.now() - startTime;
    const natsConnected = natsHealthy === this.natsServiceCount;

    this.logger.log(
      `Warmup completed in ${totalTime}ms - HTTP: ${httpHealthy}/${this.services.length}, NATS: ${natsHealthy}/${this.services.length}`,
    );

    return {
      success: fullyHealthy === this.services.length,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: this.services.length,
        httpHealthy,
        natsHealthy,
        fullyHealthy,
        totalTime,
      },
      natsConnected,
    };
  }

  /**
   * HTTP만으로 빠른 웜업 (Cold Start 트리거용)
   */
  async warmupHttpOnly(): Promise<WarmupResult> {
    const startTime = Date.now();
    this.logger.log('Starting HTTP-only warmup...');

    const httpResults = await this.performHttpHealthChecks();

    const services: ServiceHealth[] = this.services.map((service, index) => ({
      name: service.name,
      ...httpResults[index],
      natsStatus: 'skipped' as const,
    }));

    const httpHealthy = services.filter((s) => s.httpStatus === 'ok').length;
    const totalTime = Date.now() - startTime;

    return {
      success: httpHealthy === this.services.length,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: this.services.length,
        httpHealthy,
        natsHealthy: 0,
        fullyHealthy: httpHealthy,
        totalTime,
      },
      natsConnected: false,
    };
  }

  /**
   * NATS 연결 상태만 확인
   */
  async checkNatsConnectivity(): Promise<WarmupResult> {
    const startTime = Date.now();
    this.logger.log('Checking NATS connectivity...');

    const natsResults = await this.performNatsPingChecks();

    const services: ServiceHealth[] = this.services.map((service, index) => ({
      name: service.name,
      httpStatus: 'skipped' as const,
      ...natsResults[index],
    }));

    const natsHealthy = services.filter((s) => s.natsStatus === 'ok').length;
    const totalTime = Date.now() - startTime;

    return {
      success: natsHealthy === this.services.length,
      timestamp: new Date().toISOString(),
      services,
      summary: {
        total: this.services.length,
        httpHealthy: 0,
        natsHealthy,
        fullyHealthy: natsHealthy,
        totalTime,
      },
      natsConnected: natsHealthy === this.services.length,
    };
  }

  /**
   * HTTP Health Check 수행
   */
  private async performHttpHealthChecks(): Promise<
    Array<{ httpStatus: 'ok' | 'error'; httpResponseTime: number; httpMessage?: string }>
  > {
    const results = await Promise.allSettled(
      this.services.map(async (service) => {
        const start = Date.now();
        try {
          const response = await fetch(`${service.httpUrl}/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(30000),
          });
          const responseTime = Date.now() - start;

          if (response.ok) {
            this.logger.debug(`[HTTP] ${service.name}: OK (${responseTime}ms)`);
            return { httpStatus: 'ok' as const, httpResponseTime: responseTime };
          } else {
            this.logger.warn(`[HTTP] ${service.name}: HTTP ${response.status}`);
            return {
              httpStatus: 'error' as const,
              httpResponseTime: responseTime,
              httpMessage: `HTTP ${response.status}`,
            };
          }
        } catch (error) {
          const responseTime = Date.now() - start;
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`[HTTP] ${service.name}: ${message}`);
          return {
            httpStatus: 'error' as const,
            httpResponseTime: responseTime,
            httpMessage: message,
          };
        }
      }),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        httpStatus: 'error' as const,
        httpResponseTime: 0,
        httpMessage: 'Promise rejected',
      };
    });
  }

  /**
   * NATS Ping 수행
   */
  private async performNatsPingChecks(): Promise<
    Array<{ natsStatus: 'ok' | 'error' | 'skipped'; natsResponseTime: number; natsMessage?: string }>
  > {
    const results = await Promise.allSettled(
      this.services.map(async (service) => {
        // Skip NATS check for HTTP-only services
        if (!service.isNatsService || !service.natsPattern) {
          this.logger.debug(`[NATS] ${service.name}: Skipped (HTTP-only BFF)`);
          return {
            natsStatus: 'skipped' as const,
            natsResponseTime: 0,
            natsMessage: 'HTTP-only service',
          };
        }

        const start = Date.now();
        try {
          const response = await this.natsClient.send<{ pong: boolean; service: string }>(
            service.natsPattern,
            { ping: true, timestamp: new Date().toISOString() },
            NATS_TIMEOUTS.QUICK,
          );
          const responseTime = Date.now() - start;

          if (response?.pong) {
            this.logger.debug(`[NATS] ${service.name}: PONG (${responseTime}ms)`);
            return { natsStatus: 'ok' as const, natsResponseTime: responseTime };
          } else {
            this.logger.warn(`[NATS] ${service.name}: Invalid response`);
            return {
              natsStatus: 'error' as const,
              natsResponseTime: responseTime,
              natsMessage: 'Invalid response',
            };
          }
        } catch (error) {
          const responseTime = Date.now() - start;
          const message = error instanceof Error ? error.message : 'Unknown error';
          this.logger.error(`[NATS] ${service.name}: ${message}`);
          return {
            natsStatus: 'error' as const,
            natsResponseTime: responseTime,
            natsMessage: message,
          };
        }
      }),
    );

    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      return {
        natsStatus: 'error' as const,
        natsResponseTime: 0,
        natsMessage: 'Promise rejected',
      };
    });
  }

  /**
   * NATS 서비스 수 반환 (HTTP-only 제외)
   */
  private get natsServiceCount(): number {
    return this.services.filter((s) => s.isNatsService).length;
  }
}
