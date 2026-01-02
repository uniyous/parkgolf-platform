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
import { AppException, StandardErrorResponse } from './app.exception';
import { Errors } from './catalog/error-catalog';

/**
 * 통합 예외 필터
 *
 * HTTP와 RPC 컨텍스트 모두에서 동작하며, 일관된 에러 응답 형식을 보장합니다.
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

  /**
   * HTTP 컨텍스트 예외 처리
   */
  private handleHttpException(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const errorResponse = this.createErrorResponse(exception);
    const status = this.getHttpStatus(exception);

    this.logError(exception, request?.url, request?.method);

    response.status(status).json(errorResponse);
  }

  /**
   * RPC 컨텍스트 예외 처리
   */
  private handleRpcException(exception: unknown, host: ArgumentsHost) {
    const errorResponse = this.createErrorResponse(exception);

    this.logError(exception, 'RPC', 'MESSAGE');

    // RPC 컨텍스트에서는 에러 응답 객체를 직접 반환
    return errorResponse;
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

    // RpcException 처리
    if (exception instanceof RpcException) {
      const error = exception.getError();

      // 이미 표준 형식인 경우
      if (this.isStandardErrorResponse(error)) {
        return error as StandardErrorResponse;
      }

      // 문자열 에러
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

      // 객체 에러
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

      // 이미 표준 형식인 경우
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

      // 객체 응답 (NestJS 기본 형식)
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

    // Prisma 에러 처리
    if (this.isPrismaError(exception)) {
      return this.handlePrismaError(exception, timestamp);
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
    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null) {
        const errorObj = error as Record<string, unknown>;
        if (typeof errorObj.statusCode === 'number') {
          return errorObj.statusCode;
        }
      }
    }
    if (this.isPrismaError(exception)) {
      return this.getPrismaHttpStatus(exception);
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  /**
   * Prisma 에러 여부 확인
   */
  private isPrismaError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      exception.constructor.name.startsWith('Prisma') &&
      'code' in exception
    );
  }

  /**
   * Prisma 에러 처리
   */
  private handlePrismaError(exception: unknown, timestamp: string): StandardErrorResponse {
    const prismaError = exception as { code: string; message: string };

    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        return {
          success: false,
          error: {
            code: Errors.Database.UNIQUE_VIOLATION.code,
            message: Errors.Database.UNIQUE_VIOLATION.message,
          },
          timestamp,
        };
      case 'P2025': // Record not found
        return {
          success: false,
          error: {
            code: Errors.Database.NOT_FOUND.code,
            message: Errors.Database.NOT_FOUND.message,
          },
          timestamp,
        };
      case 'P2003': // Foreign key constraint violation
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
            message: prismaError.message || Errors.System.INTERNAL.message,
          },
          timestamp,
        };
    }
  }

  /**
   * Prisma 에러 HTTP 상태 코드
   */
  private getPrismaHttpStatus(exception: unknown): number {
    const prismaError = exception as { code: string };

    switch (prismaError.code) {
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      case 'P2003':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
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
