import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { Errors } from '../exceptions';

/**
 * NATS Timeout Constants
 */
export const NATS_TIMEOUTS = {
  /** Quick operations (single item fetch, validation) */
  QUICK: 5000,
  /** Default operations */
  DEFAULT: 15000,
  /** List queries with pagination */
  LIST_QUERY: 30000,
  /** Analytics and statistics */
  ANALYTICS: 30000,
  /** Bulk operations (time slot generation, batch processing) */
  BULK_OPERATION: 120000,
} as const;

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
  async send<T>(subject: string, payload: any, timeoutMs: number = NATS_TIMEOUTS.DEFAULT): Promise<T> {
    const startTime = Date.now();
    try {
      this.logger.log(`[PERF] NATS send START: ${subject}`);

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
    this.logger.error(`NATS error: ${subject}`, error);
    return new HttpException(
      {
        success: false,
        error: {
          code: Errors.System.INTERNAL.code,
          message: Errors.System.INTERNAL.message,
        },
        timestamp: new Date().toISOString(),
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 에러 코드에서 HTTP 상태 코드 추출
   * 에러 카탈로그 코드 패턴: AUTH_xxx, USER_xxx, ADMIN_xxx, BOOK_xxx, COURSE_xxx, VAL_xxx, EXT_xxx, DB_xxx, SYS_xxx
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
        if (code.endsWith('001')) return HttpStatus.NOT_FOUND; // xxx_NOT_FOUND
        if (code.endsWith('002') || code.endsWith('003')) return HttpStatus.CONFLICT; // xxx_EXISTS
        if (code.endsWith('004')) return HttpStatus.FORBIDDEN; // xxx_INACTIVE
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
