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
 *     code: 'WEATHER_001',
 *     message: '유효하지 않은 좌표입니다'
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
      return this.handleRpcException(exception);
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
   *
   * RpcException을 throw하여 NATS를 통해 에러를 전파합니다.
   * BFF의 NatsClientService.handleError에서 이 에러를 파싱하여 HttpException으로 변환합니다.
   */
  private handleRpcException(exception: unknown) {
    const errorResponse = this.createErrorResponse(exception);

    this.logError(exception, 'RPC', 'MESSAGE');

    // RpcException을 throw하여 NATS 클라이언트가 에러로 수신할 수 있도록 함
    throw new RpcException(JSON.stringify(errorResponse));
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

        // ValidationPipe 에러 (class-validator) - message가 배열인 경우
        if (Array.isArray(responseObj.message)) {
          return {
            success: false,
            error: {
              code: Errors.System.INTERNAL.code,
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
        return Errors.Weather.INVALID_COORDINATES.code;
      case HttpStatus.NOT_FOUND:
        return Errors.Weather.LOCATION_NOT_FOUND.code;
      case HttpStatus.UNAUTHORIZED:
        return Errors.Kma.INVALID_API_KEY.code;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return Errors.Kma.API_UNAVAILABLE.code;
      case HttpStatus.GATEWAY_TIMEOUT:
        return Errors.Kma.API_TIMEOUT.code;
      case HttpStatus.BAD_GATEWAY:
        return Errors.Kma.API_ERROR.code;
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
