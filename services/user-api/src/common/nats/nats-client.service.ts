import { Injectable, Inject, Logger, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { Errors } from '../exceptions';
import { NATS_TIMEOUTS } from '../constants';

/**
 * NATS Client Wrapper Service
 * NATS 통신을 위한 공통 래퍼 - 타임아웃, 에러 핸들링, 로깅 통합
 */
@Injectable()
export class NatsClientService implements OnModuleInit {
  private readonly logger = new Logger(NatsClientService.name);
  private isConnected = false;

  constructor(
    @Inject('NATS_CLIENT') private readonly natsClient: ClientProxy,
  ) {}

  async onModuleInit() {
    this.connectWithRetry().catch(() => {});
  }

  private async connectWithRetry() {
    const MAX_ATTEMPTS = 50;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await this.natsClient.connect();
        this.isConnected = true;
        this.logger.log(`NATS connected (attempt ${attempt})`);
        return;
      } catch (error: any) {
        this.isConnected = false;
        if (attempt === MAX_ATTEMPTS) {
          this.logger.error(`NATS failed after ${MAX_ATTEMPTS} attempts`);
          return;
        }
        const delay = Math.min(2000 * 2 ** Math.min(attempt - 1, 3), 15000);
        this.logger.warn(`NATS attempt ${attempt}/${MAX_ATTEMPTS}: ${error.message}. Retry in ${delay / 1000}s`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  /**
   * NATS 연결 상태 확인
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * NATS 메시지 전송 (공통 래퍼)
   * @param subject NATS subject
   * @param payload 전송 데이터
   * @param timeoutMs 타임아웃 (기본 30초)
   */
  async send<T>(subject: string, payload: any, timeoutMs: number = NATS_TIMEOUTS.DEFAULT): Promise<T> {
    const startTime = Date.now();
    try {
      this.logger.log(`[PERF] NATS send START: ${subject} (connected: ${this.isConnected})`);

      // 연결이 안 되어 있으면 재연결 시도
      if (!this.isConnected) {
        this.logger.warn(`NATS not connected, attempting to reconnect for: ${subject}`);
        try {
          await this.natsClient.connect();
          this.isConnected = true;
          this.logger.log('NATS reconnected successfully');
        } catch (connectError) {
          this.logger.error('NATS reconnection failed', connectError instanceof Error ? connectError.message : connectError);
        }
      }

      const result = await firstValueFrom(
        this.natsClient.send(subject, payload).pipe(timeout(timeoutMs)),
      );

      this.logger.log(`[PERF] NATS send END: ${subject} - ${Date.now() - startTime}ms`);

      // 마이크로서비스에서 반환한 에러 응답 체크 (success: false)
      if (result && typeof result === 'object' && (result as any).success === false && (result as any).error) {
        throw this.handleError(result, subject);
      }

      return result as T;
    } catch (error) {
      this.logger.error(`[PERF] NATS send FAILED: ${subject} - ${Date.now() - startTime}ms`,
        error instanceof Error ? `${error.constructor.name}: ${error.message}` : String(error));
      throw this.handleError(error, subject);
    }
  }

  /**
   * NATS 이벤트 발행 (응답 불필요)
   */
  emit(subject: string, payload: any): void {
    this.logger.debug(`NATS emit: ${subject}`);
    this.natsClient.emit(subject, payload);
  }

  /**
   * NATS 에러를 HttpException으로 변환
   */
  private handleError(error: any, subject: string): HttpException {
    this.logger.debug(`NATS handleError: ${subject}, error type: ${error?.constructor?.name}, error: ${JSON.stringify(error)}`);

    // 타임아웃 에러
    if (error instanceof TimeoutError) {
      this.logger.error(`NATS timeout: ${subject}`);
      return new HttpException(
        {
          success: false,
          message: Errors.System.TIMEOUT.message,
          error: {
            code: Errors.System.TIMEOUT.code,
            message: Errors.System.TIMEOUT.message,
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    // RpcException에서 전달된 에러 (success: false 형식) - 직접 객체
    if (error?.success === false && error?.error) {
      const statusCode = this.getStatusFromErrorCode(error.error.code);
      return new HttpException(error, statusCode);
    }

    // RpcException에서 전달된 에러 - message 필드에 JSON 문자열로 포함된 경우
    if (error?.message) {
      try {
        const parsed = JSON.parse(error.message);
        if (parsed?.success === false && parsed?.error) {
          const statusCode = this.getStatusFromErrorCode(parsed.error.code);
          return new HttpException(parsed, statusCode);
        }
      } catch {
        // JSON 파싱 실패시 무시하고 계속 진행
      }
    }

    // 이미 HttpException인 경우
    if (error instanceof HttpException) {
      return error;
    }

    // NATS 연결 에러
    if (error?.code === 'ECONNREFUSED' || error?.message?.includes('NATS')) {
      this.logger.error(`NATS connection error: ${subject}`, error.message);
      return new HttpException(
        {
          success: false,
          message: Errors.System.UNAVAILABLE.message,
          error: {
            code: Errors.System.UNAVAILABLE.code,
            message: Errors.System.UNAVAILABLE.message,
          },
          timestamp: new Date().toISOString(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // 알 수 없는 에러
    const errorMessage = error instanceof Error ? error.message : Errors.System.INTERNAL.message;
    this.logger.error(`NATS error: ${subject} - ${errorMessage}`, error);
    return new HttpException(
      {
        success: false,
        message: errorMessage,
        error: {
          code: Errors.System.INTERNAL.code,
          message: errorMessage,
        },
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 에러 코드에서 HTTP 상태 코드 추출
   * 에러 카탈로그 코드 패턴: AUTH_xxx, USER_xxx, ADMIN_xxx, FRIEND_xxx, BOOK_xxx, COURSE_xxx,
   * CHAT_xxx, NOTI_xxx, PAY_xxx, REFUND_xxx, BILLING_xxx, WEATHER_xxx, KMA_xxx,
   * LOCATION_xxx, KAKAO_xxx, VAL_xxx, EXT_xxx, DB_xxx, SYS_xxx
   */
  private getStatusFromErrorCode(code: string): HttpStatus {
    if (!code) return HttpStatus.INTERNAL_SERVER_ERROR;

    // 에러 코드 접두사 기반 매핑
    const prefix = code.split('_')[0];

    switch (prefix) {
      case 'AUTH':
        // AUTH_001 ~ AUTH_004, AUTH_007: 401, AUTH_005 ~ AUTH_006: 403
        if (['AUTH_005', 'AUTH_006'].includes(code)) {
          return HttpStatus.FORBIDDEN;
        }
        return HttpStatus.UNAUTHORIZED;

      case 'USER':
      case 'ADMIN':
        // NOT_FOUND: 404, EXISTS: 409, INACTIVE: 403
        if (code.endsWith('001')) return HttpStatus.NOT_FOUND;
        if (code.endsWith('002') || code.endsWith('003')) return HttpStatus.CONFLICT;
        if (code.endsWith('004')) return HttpStatus.FORBIDDEN;
        return HttpStatus.BAD_REQUEST;

      case 'BOOK':
        // NOT_FOUND: 404, SLOT_UNAVAILABLE: 409, others: 400
        if (code === 'BOOK_001') return HttpStatus.NOT_FOUND;
        if (code === 'BOOK_002') return HttpStatus.CONFLICT;
        return HttpStatus.BAD_REQUEST;

      case 'COURSE':
        // NOT_FOUND: 404, INACTIVE: 400
        if (code === 'COURSE_007') return HttpStatus.BAD_REQUEST;
        return HttpStatus.NOT_FOUND;

      case 'VAL':
        return HttpStatus.BAD_REQUEST;

      case 'EXT':
        // UNAVAILABLE: 503, TIMEOUT: 504, others: 502
        if (code === 'EXT_001') return HttpStatus.SERVICE_UNAVAILABLE;
        if (code === 'EXT_002') return HttpStatus.GATEWAY_TIMEOUT;
        return HttpStatus.BAD_GATEWAY;

      case 'DB':
        // UNIQUE_VIOLATION: 409, NOT_FOUND: 404, FK_VIOLATION: 400, CONNECTION_ERROR: 503
        if (code === 'DB_001') return HttpStatus.CONFLICT;
        if (code === 'DB_002') return HttpStatus.NOT_FOUND;
        if (code === 'DB_003') return HttpStatus.BAD_REQUEST;
        if (code === 'DB_004') return HttpStatus.SERVICE_UNAVAILABLE;
        return HttpStatus.INTERNAL_SERVER_ERROR;

      case 'SYS':
        // INTERNAL: 500, UNAVAILABLE/MAINTENANCE: 503, TIMEOUT: 408, RATE_LIMIT: 429
        if (code === 'SYS_002' || code === 'SYS_005') return HttpStatus.SERVICE_UNAVAILABLE;
        if (code === 'SYS_003') return HttpStatus.REQUEST_TIMEOUT;
        if (code === 'SYS_004') return HttpStatus.TOO_MANY_REQUESTS;
        return HttpStatus.INTERNAL_SERVER_ERROR;

      case 'PAY':
        // PAY_001: NOT_FOUND(404), PAY_002~011: BAD_REQUEST(400)
        if (code === 'PAY_001') return HttpStatus.NOT_FOUND;
        return HttpStatus.BAD_REQUEST;

      case 'REFUND':
        // REFUND_001: NOT_FOUND(404)
        if (code === 'REFUND_001') return HttpStatus.NOT_FOUND;
        return HttpStatus.BAD_REQUEST;

      case 'BILLING':
        // BILLING_001: NOT_FOUND(404), BILLING_003: CONFLICT(409)
        if (code === 'BILLING_001') return HttpStatus.NOT_FOUND;
        if (code === 'BILLING_003') return HttpStatus.CONFLICT;
        return HttpStatus.BAD_REQUEST;

      case 'FRIEND':
        // NOT_FOUND: 404, ALREADY_FRIEND/ALREADY_REQUESTED: 409, NO_PERMISSION: 403
        if (code === 'FRIEND_001') return HttpStatus.NOT_FOUND;
        if (code === 'FRIEND_003' || code === 'FRIEND_004') return HttpStatus.CONFLICT;
        if (code === 'FRIEND_006') return HttpStatus.FORBIDDEN;
        return HttpStatus.BAD_REQUEST;

      case 'CHAT':
        // ROOM_NOT_FOUND/MESSAGE_NOT_FOUND: 404, NOT_AUTHORIZED: 403
        if (code === 'CHAT_001' || code === 'CHAT_002') return HttpStatus.NOT_FOUND;
        if (code === 'CHAT_003') return HttpStatus.FORBIDDEN;
        return HttpStatus.BAD_REQUEST;

      case 'NOTI':
        // NOT_FOUND/TEMPLATE_NOT_FOUND: 404, INVALID_TYPE: 400, SEND/DELIVERY_FAILED: 500
        if (code === 'NOTI_001' || code === 'NOTI_003') return HttpStatus.NOT_FOUND;
        if (code === 'NOTI_004') return HttpStatus.BAD_REQUEST;
        return HttpStatus.INTERNAL_SERVER_ERROR;

      case 'WEATHER':
        // INVALID_COORDINATES: 400, LOCATION_NOT_FOUND: 404, FORECAST_NOT_AVAILABLE: 503
        if (code === 'WEATHER_001') return HttpStatus.BAD_REQUEST;
        if (code === 'WEATHER_002') return HttpStatus.NOT_FOUND;
        return HttpStatus.SERVICE_UNAVAILABLE;

      case 'KMA':
        // API_ERROR: 502, TIMEOUT: 504, UNAVAILABLE: 503, INVALID_KEY: 401, NO_DATA: 404
        if (code === 'KMA_001') return HttpStatus.BAD_GATEWAY;
        if (code === 'KMA_002') return HttpStatus.GATEWAY_TIMEOUT;
        if (code === 'KMA_003') return HttpStatus.SERVICE_UNAVAILABLE;
        if (code === 'KMA_004') return HttpStatus.UNAUTHORIZED;
        if (code === 'KMA_005') return HttpStatus.NOT_FOUND;
        return HttpStatus.BAD_GATEWAY;

      case 'LOCATION':
        // ADDRESS_NOT_FOUND: 404, INVALID_COORDINATES: 400, SEARCH_FAILED: 503
        if (code === 'LOCATION_001') return HttpStatus.NOT_FOUND;
        if (code === 'LOCATION_002') return HttpStatus.BAD_REQUEST;
        return HttpStatus.SERVICE_UNAVAILABLE;

      case 'KAKAO':
        // API_ERROR: 502, TIMEOUT: 504, KEY_NOT_CONFIGURED: 500
        if (code === 'KAKAO_001') return HttpStatus.BAD_GATEWAY;
        if (code === 'KAKAO_002') return HttpStatus.GATEWAY_TIMEOUT;
        return HttpStatus.INTERNAL_SERVER_ERROR;

      default:
        break;
    }

    // 문자열 패턴 기반 폴백 (레거시 코드 호환)
    const codeUpper = code.toUpperCase();
    if (codeUpper.includes('NOT_FOUND')) return HttpStatus.NOT_FOUND;
    if (codeUpper.includes('UNAUTHORIZED') || codeUpper.includes('MISSING_TOKEN'))
      return HttpStatus.UNAUTHORIZED;
    if (codeUpper.includes('FORBIDDEN') || codeUpper.includes('INSUFFICIENT'))
      return HttpStatus.FORBIDDEN;
    if (codeUpper.includes('DUPLICATE') || codeUpper.includes('ALREADY_EXISTS'))
      return HttpStatus.CONFLICT;
    if (codeUpper.includes('INVALID') || codeUpper.includes('VALIDATION'))
      return HttpStatus.BAD_REQUEST;
    if (codeUpper.includes('TIMEOUT')) return HttpStatus.REQUEST_TIMEOUT;
    if (codeUpper.includes('UNAVAILABLE')) return HttpStatus.SERVICE_UNAVAILABLE;

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
}
