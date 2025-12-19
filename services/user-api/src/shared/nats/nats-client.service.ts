import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';

/**
 * NATS Client Wrapper Service
 * NATS 통신을 위한 공통 래퍼 - 타임아웃, 에러 핸들링, 로깅 통합
 */
@Injectable()
export class NatsClientService {
  private readonly logger = new Logger(NatsClientService.name);

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  /**
   * NATS 메시지 전송 (공통 래퍼)
   * @param subject NATS subject
   * @param payload 전송 데이터
   * @param timeoutMs 타임아웃 (기본 15초)
   */
  async send<T>(subject: string, payload: any, timeoutMs = 15000): Promise<T> {
    try {
      this.logger.debug(`NATS send: ${subject}`);

      const result = await firstValueFrom(
        this.natsClient.send(subject, payload).pipe(timeout(timeoutMs)),
      );

      return result as T;
    } catch (error) {
      if (error instanceof TimeoutError) {
        this.logger.error(`NATS timeout: ${subject} (${timeoutMs}ms)`);
        throw new Error(`Service timeout: ${subject}`);
      }

      this.logger.error(`NATS error: ${subject}`, error);
      throw error;
    }
  }

  /**
   * NATS 이벤트 발행 (응답 불필요)
   */
  emit(subject: string, payload: any): void {
    this.logger.debug(`NATS emit: ${subject}`);
    this.natsClient.emit(subject, payload);
  }
}
