import { Controller, Get, Logger } from '@nestjs/common';
import { HealthCheck, HealthCheckResult, HealthCheckService, HealthIndicatorResult, MicroserviceHealthIndicator } from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NatsOptions, Transport } from '@nestjs/microservices';

@ApiTags('health/check')
@Controller('api/health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name); // 로거 인스턴스 추가

  constructor(
    private health: HealthCheckService,
    private microservice: MicroserviceHealthIndicator,
    private configService: ConfigService,
  ) {}

  @Get()
  @HealthCheck()
  check(): Promise<HealthCheckResult> {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.logger.log(`Health check requested. Current NODE_ENV: ${nodeEnv}`);

    // NATS 연결 옵션 구성
    const natsServersRaw = this.configService.get<string>('NATS_URLS'); // 예: 'nats://localhost:4222,nats://another-server:4222'
    if (!natsServersRaw) {
      this.logger.error('NATS_SERVERS environment variable is not defined.');
      // NATS 서버 정보가 없으면 헬스 체크 실패 처리 또는 다른 방식으로 처리
      return Promise.resolve({
        status: 'error',
        details: { nats: { status: 'down', message: 'NATS_SERVERS not configured' } },
      } as HealthCheckResult);
    }

    const natsServers = natsServersRaw
      .split(',')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);
    if (natsServers.length === 0) {
      this.logger.error('No valid NATS servers found in NATS_SERVERS environment variable.');
      return Promise.resolve({
        status: 'error',
        details: { nats: { status: 'down', message: 'No valid NATS_SERVERS configured' } },
      } as HealthCheckResult);
    }

    const natsOptions = {
      servers: [...natsServers].sort(() => Math.random() - 0.5),
      reconnect: true,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 5000,
      timeout: 5000,
    } as NatsOptions['options'];

    switch (nodeEnv) {
      case 'local':
        this.logger.log('Using NATS options for LOCAL environment.');
        // 로컬 환경에서는 natsServers 배열을 그대로 사용하거나,
        // 더 간단한 설정을 원하면 여기서 오버라이드 가능
        // 예: natsOptions.servers = ['nats://localhost:4222'];
        break;
      case 'development':
        this.logger.log('Using NATS options for DEVELOPMENT environment.');
        // 개발 환경 특정 옵션 (필요시)
        // 예: natsOptions.timeout = 3000;
        // 예: natsOptions.name = `health-checker-dev-${Math.random().toString(36).substring(7)}`; // 디버깅용 클라이언트 이름
        break;
      case 'production':
        this.logger.log('Using NATS options for PRODUCTION environment.');
        // 운영 환경 특정 옵션
        // 예: natsOptions.servers를 랜덤 셔플하여 연결 시도 분산
        // 예: natsOptions.reconnectTimeWait = 3000;
        // 예: natsOptions.name = `health-checker-prod`;
        break;
      default:
        this.logger.warn(`Unknown NODE_ENV: ${nodeEnv}. Using default NATS options.`);
        break;
    }

    const microservicePingOptions = {
      transport: Transport.NATS,
      options: natsOptions,
      timeout: this.configService.get<number>('HEALTH_NATS_PING_TIMEOUT', 3000),
    };

    return this.health.check([
      async (): Promise<HealthIndicatorResult> => {
        this.logger.debug('Performing NATS ping check with options:', microservicePingOptions);
        try {
          const result = await this.microservice.pingCheck('nats', microservicePingOptions);
          this.logger.log('NATS health check successful.');
          return result;
        } catch (error: unknown) {
          if (error instanceof Error) {
            this.logger.error(`NATS health check failed: ${error.message}`, error.stack);
          } else {
            this.logger.error(`NATS health check failed with an unknown error type: ${JSON.stringify(error)}`);
          }
          throw error;
        }
      },
      // () => 다른 헬스 인디케이터 (예: DB 연결, 디스크 공간 등)
    ]);
  }
}
