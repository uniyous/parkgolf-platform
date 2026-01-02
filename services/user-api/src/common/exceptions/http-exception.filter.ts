import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { AppException, StandardErrorResponse } from './app.exception';
import { Errors } from './catalog/error-catalog';

/**
 * BFF HTTP 예외 필터
 *
 * BFF 레이어 전용 HTTP 예외 필터입니다.
 * RPC 에러는 NatsClientService에서 HttpException으로 변환되어 여기서 처리됩니다.
 *
 * 응답 형식:
 * {
 *   success: false,
 *   error: {
 *     code: 'AUTH_001',
 *     message: '이메일 또는 비밀번호가 올바르지 않습니다'
 *   },
 *   timestamp: '2025-01-02T12:00:00.000Z'
 * }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorResponse = this.createErrorResponse(exception);
    const status = this.getHttpStatus(exception);

    this.logError(exception, request?.url, request?.method);

    response.status(status).json(errorResponse);
  }

  /**
   * 표준 에러 응답 생성
   */
  private createErrorResponse(exception: unknown): StandardErrorResponse {
    const timestamp = new Date().toISOString();

    // AppException 처리
    if (exception instanceof AppException) {
      return exception.toRpcError();
    }

    // HttpException 처리
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      // 이미 표준 형식인 경우 (NatsClientService에서 변환된 에러)
      if (this.isStandardErrorResponse(response)) {
        return response as StandardErrorResponse;
      }

      // 문자열 응답
      if (typeof response === 'string') {
        return {
          success: false,
          error: {
            code: this.getHttpErrorCode(exception.getStatus()),
            message: response,
          },
          timestamp,
        };
      }

      // 객체 응답 (NestJS 기본 형식 또는 ValidationPipe 에러)
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;

        // ValidationPipe 에러 (class-validator)
        if (Array.isArray(responseObj.message)) {
          return {
            success: false,
            error: {
              code: Errors.Validation.INVALID_INPUT.code,
              message: responseObj.message.join(', '),
            },
            timestamp,
          };
        }

        return {
          success: false,
          error: {
            code: (responseObj.code as string) || this.getHttpErrorCode(exception.getStatus()),
            message: (responseObj.message as string) || exception.message,
          },
          timestamp,
        };
      }
    }

    // 기타 에러
    const message = exception instanceof Error ? exception.message : Errors.System.INTERNAL.message;
    return {
      success: false,
      error: {
        code: Errors.System.INTERNAL.code,
        message,
      },
      timestamp,
    };
  }

  /**
   * 표준 에러 응답 형식 여부 확인
   */
  private isStandardErrorResponse(obj: unknown): boolean {
    if (typeof obj !== 'object' || obj === null) return false;
    const response = obj as Record<string, unknown>;
    return (
      response.success === false &&
      typeof response.error === 'object' &&
      response.error !== null &&
      typeof (response.error as Record<string, unknown>).code === 'string' &&
      typeof (response.error as Record<string, unknown>).message === 'string'
    );
  }

  /**
   * HTTP 상태 코드로 에러 코드 매핑
   */
  private getHttpErrorCode(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return Errors.Validation.INVALID_INPUT.code;
      case HttpStatus.UNAUTHORIZED:
        return Errors.Auth.INVALID_CREDENTIALS.code;
      case HttpStatus.FORBIDDEN:
        return Errors.Auth.INSUFFICIENT_PERMISSIONS.code;
      case HttpStatus.NOT_FOUND:
        return Errors.Database.NOT_FOUND.code;
      case HttpStatus.CONFLICT:
        return Errors.Database.UNIQUE_VIOLATION.code;
      case HttpStatus.REQUEST_TIMEOUT:
        return Errors.System.TIMEOUT.code;
      case HttpStatus.TOO_MANY_REQUESTS:
        return Errors.System.RATE_LIMIT.code;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return Errors.System.UNAVAILABLE.code;
      default:
        return Errors.System.INTERNAL.code;
    }
  }

  /**
   * HTTP 상태 코드 추출
   */
  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * 에러 로깅
   */
  private logError(exception: unknown, path?: string, method?: string) {
    const context = `${method || 'UNKNOWN'} ${path || 'UNKNOWN'}`;

    if (exception instanceof AppException) {
      this.logger.warn(`[${exception.code}] ${exception.getErrorMessage()} - ${context}`);
    } else if (exception instanceof HttpException) {
      const status = exception.getStatus();
      if (status >= 500) {
        this.logger.error(`[${status}] ${exception.message} - ${context}`, exception.stack);
      } else {
        this.logger.warn(`[${status}] ${exception.message} - ${context}`);
      }
    } else if (exception instanceof Error) {
      this.logger.error(`[ERROR] ${exception.message} - ${context}`, exception.stack);
    } else {
      this.logger.error(`[UNKNOWN] ${String(exception)} - ${context}`);
    }
  }
}
