import { Injectable, Inject, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, TimeoutError } from 'rxjs';
import { ErrorCodes } from '../types/error-response.type';

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
    try {
      this.logger.debug(`NATS send: ${subject}`);

      const result = await firstValueFrom(
        this.natsClient.send(subject, payload).pipe(timeout(timeoutMs)),
      );

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
    // 타임아웃 에러
    if (error instanceof TimeoutError) {
      this.logger.error(`NATS timeout: ${subject}`);
      return new HttpException(
        {
          success: false,
          error: {
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: 'Service request timeout. Please try again.',
          },
        },
        HttpStatus.REQUEST_TIMEOUT,
      );
    }

    // NATS 서비스에서 반환한 에러 응답 (success: false 형식)
    if (error.success === false && error.error) {
      const statusCode = this.getStatusFromErrorCode(error.error.code);
      return new HttpException(error, statusCode);
    }

    // 이미 HttpException인 경우
    if (error instanceof HttpException) {
      return error;
    }

    // NATS 연결 에러
    if (error.code === 'ECONNREFUSED' || error.message?.includes('NATS')) {
      this.logger.error(`NATS connection error: ${subject}`, error.message);
      return new HttpException(
        {
          success: false,
          error: {
            code: ErrorCodes.SERVICE_UNAVAILABLE,
            message: 'Service temporarily unavailable',
          },
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
          code: ErrorCodes.SYSTEM_ERROR,
          message: 'Internal server error',
        },
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 에러 코드에서 HTTP 상태 코드 추출
   */
  private getStatusFromErrorCode(code: string): HttpStatus {
    if (!code) return HttpStatus.INTERNAL_SERVER_ERROR;

    // ErrorCodes enum 기반
    switch (code) {
      case ErrorCodes.UNAUTHORIZED:
      case ErrorCodes.TOKEN_EXPIRED:
      case ErrorCodes.INVALID_CREDENTIALS:
        return HttpStatus.UNAUTHORIZED;
      case ErrorCodes.FORBIDDEN:
        return HttpStatus.FORBIDDEN;
      case ErrorCodes.RESOURCE_NOT_FOUND:
        return HttpStatus.NOT_FOUND;
      case ErrorCodes.DUPLICATE_RESOURCE:
        return HttpStatus.CONFLICT;
      case ErrorCodes.VALIDATION_ERROR:
      case ErrorCodes.BUSINESS_RULE_VIOLATION:
        return HttpStatus.BAD_REQUEST;
      case ErrorCodes.SERVICE_UNAVAILABLE:
        return HttpStatus.SERVICE_UNAVAILABLE;
      default:
        break;
    }

    // 문자열 패턴 기반 폴백
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
