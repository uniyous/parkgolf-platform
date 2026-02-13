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

  private handleRpcException(exception: unknown): Observable<never> {
    const errorResponse = this.createErrorResponse(exception);

    this.logError(exception, 'RPC', 'MESSAGE');

    return throwError(() => new RpcException(JSON.stringify(errorResponse)));
  }

  private createErrorResponse(exception: unknown): StandardErrorResponse {
    const timestamp = new Date().toISOString();

    if (exception instanceof AppException) {
      return exception.toRpcError();
    }

    if (exception instanceof RpcException) {
      const error = exception.getError();

      if (this.isStandardErrorResponse(error)) {
        return error as StandardErrorResponse;
      }

      if (typeof error === 'string') {
        return {
          success: false,
          error: { code: Errors.System.INTERNAL.code, message: error },
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

    if (exception instanceof HttpException) {
      const response = exception.getResponse();

      if (this.isStandardErrorResponse(response)) {
        return response as StandardErrorResponse;
      }

      if (typeof response === 'string') {
        return {
          success: false,
          error: { code: this.getHttpErrorCode(exception.getStatus()), message: response },
          timestamp,
        };
      }

      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;

        if (Array.isArray(responseObj.message)) {
          return {
            success: false,
            error: { code: Errors.System.INTERNAL.code, message: responseObj.message.join(', ') },
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

    const message = exception instanceof Error ? exception.message : Errors.System.INTERNAL.message;
    return {
      success: false,
      error: { code: Errors.System.INTERNAL.code, message },
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
        return Errors.Location.INVALID_COORDINATES.code;
      case HttpStatus.NOT_FOUND:
        return Errors.Location.ADDRESS_NOT_FOUND.code;
      case HttpStatus.UNAUTHORIZED:
        return Errors.Kakao.API_KEY_NOT_CONFIGURED.code;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return Errors.Location.SEARCH_FAILED.code;
      case HttpStatus.BAD_GATEWAY:
        return Errors.Kakao.API_ERROR.code;
      case HttpStatus.GATEWAY_TIMEOUT:
        return Errors.Kakao.API_TIMEOUT.code;
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
    return HttpStatus.INTERNAL_SERVER_ERROR;
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
