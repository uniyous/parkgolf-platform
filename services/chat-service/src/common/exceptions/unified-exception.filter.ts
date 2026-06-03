import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Response } from 'express';
import { throwError, Observable } from 'rxjs';
import { AppException, StandardErrorResponse } from './app.exception';
import { Errors } from './catalog/error-catalog';

/**
 * 통합 예외 필터
 *
 * HTTP와 RPC 컨텍스트 모두에서 동작하며, 일관된 에러 응답 형식을 보장합니다.
 */
@Catch()
export class UnifiedExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(UnifiedExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const contextType = host.getType();

    if (contextType === 'http') {
      return this.handleHttpException(exception, host);
    } else if (contextType === 'rpc') {
      return this.handleRpcException(exception, host);
    }

    // 기타 컨텍스트 (ws 등)
    this.logger.error(`Unhandled context type: ${contextType}`, exception);
    throw exception;
  }

  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const errorResponse = this.createErrorResponse(exception);
    const status = this.getHttpStatus(exception);

    this.logError(exception, request?.url, request?.method);

    response.status(status).json(errorResponse);
  }

  private handleRpcException(exception: unknown, _host: ArgumentsHost): Observable<never> {
    const errorResponse = this.createErrorResponse(exception);

    this.logError(exception, 'RPC', 'MESSAGE');

    return throwError(() => new RpcException(JSON.stringify(errorResponse)));
  }

  private createErrorResponse(exception: unknown): StandardErrorResponse {
    const timestamp = new Date().toISOString();

    // AppException 처리
    if (exception instanceof AppException) {
      return exception.toRpcError();
    }

    // RpcException 처리
    if (exception instanceof RpcException) {
      const error = exception.getError();

      if (this.isStandardErrorResponse(error)) {
        return error as StandardErrorResponse;
      }

      if (typeof error === 'string') {
        return {
          success: false,
          error: {
            code: Errors.System.INTERNAL.code,
            message: error,
          },
          timestamp,
        };
      }

      if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        return {
          success: false,
          error: {
            code: (errorObj.code as string) || Errors.System.INTERNAL.code,
            message: (errorObj.message as string) || Errors.System.INTERNAL.message,
          },
          timestamp,
        };
      }
    }

    // HttpException 처리
    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (this.isStandardErrorResponse(response)) {
        return response as StandardErrorResponse;
      }

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

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
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

    // DB 드라이버 에러 처리 (postgres-js SQLSTATE)
    if (this.isDbError(exception)) {
      return this.handleDbError(exception, timestamp);
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
      case HttpStatus.TOO_MANY_REQUESTS:
        return Errors.System.RATE_LIMIT.code;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return Errors.System.UNAVAILABLE.code;
      default:
        return Errors.System.INTERNAL.code;
    }
  }

  private getHttpStatus(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.statusCode === 'number') {
          return errorObj.statusCode;
        }
      }
    }
    if (this.isDbError(exception)) {
      return this.getDbHttpStatus(exception);
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /** postgres-js 드라이버 에러 (SQLSTATE code 보유) */
  private isDbError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      exception.constructor.name === 'PostgresError' &&
      'code' in exception
    );
  }

  private handleDbError(exception: unknown, timestamp: string): StandardErrorResponse {
    const dbError = exception as { code: string; message: string };

    switch (dbError.code) {
      case '23505': // unique_violation (was P2002)
        return {
          success: false,
          error: {
            code: Errors.Database.UNIQUE_VIOLATION.code,
            message: Errors.Database.UNIQUE_VIOLATION.message,
          },
          timestamp,
        };
      case '23503': // foreign_key_violation (was P2003)
        return {
          success: false,
          error: {
            code: Errors.Database.FK_VIOLATION.code,
            message: Errors.Database.FK_VIOLATION.message,
          },
          timestamp,
        };
      default:
        return {
          success: false,
          error: {
            code: Errors.Database.CONNECTION_ERROR.code,
            message: dbError.message || Errors.System.INTERNAL.message,
          },
          timestamp,
        };
    }
  }

  private getDbHttpStatus(exception: unknown): number {
    const dbError = exception as { code: string };

    switch (dbError.code) {
      case '23505':
        return HttpStatus.CONFLICT;
      case '23503':
      case '23502':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

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
