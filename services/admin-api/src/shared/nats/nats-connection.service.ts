import {
  Injectable,
  Inject,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

/**
 * NATS Connection Service
 * 애플리케이션 시작/종료 시 NATS 연결을 관리
 */
@Injectable()
export class NatsConnectionService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(NatsConnectionService.name);

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.natsClient.connect();
      this.logger.log('NATS client connected successfully');
    } catch (error) {
      this.logger.error('Failed to connect to NATS', error);
      // 연결 실패 시에도 애플리케이션은 시작되도록 함
      // 재연결 로직이 자동으로 처리됨
    }
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (signal: ${signal})`);
    try {
      await this.natsClient.close();
      this.logger.log('NATS client disconnected');
    } catch (error) {
      this.logger.error('Error disconnecting NATS client', error);
    }
  }

  /**
   * NATS 클라이언트 상태 확인
   */
  isConnected(): boolean {
    return this.natsClient !== undefined;
  }
}
