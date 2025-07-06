import { Catch, ExceptionFilter, ArgumentsHost, Logger, HttpException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { RpcErrorResponse, ErrorCodes } from '../types/error-response.type';
import { handlePrismaError } from '../utils/prisma-error.handler';

@Catch()
export class GlobalRpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalRpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> {
    let errorResponse: RpcErrorResponse;

    try {
      if (exception instanceof RpcException) {
        const error = exception.getError();
        errorResponse = {
          success: false,
          error: {
            code: typeof error === 'object' && error && 'code' in error ? (error as any).code : ErrorCodes.SYSTEM_ERROR,
            message: typeof error === 'string' ? error : (error as any)?.message || 'RPC error',
            details: typeof error === 'object' && error && 'details' in error ? (error as any).details : undefined,
          },
          timestamp: new Date().toISOString(),
        };
      } else if (exception instanceof HttpException) {
        const exceptionResponse = exception.getResponse();
        errorResponse = {
          success: false,
          error: {
            code: typeof exceptionResponse === 'object' && 'code' in exceptionResponse 
              ? (exceptionResponse as any).code 
              : this.getDefaultErrorCode(exception.getStatus()),
            message: typeof exceptionResponse === 'string' 
              ? exceptionResponse 
              : (exceptionResponse as any).message || exception.message,
            details: typeof exceptionResponse === 'object' && 'details' in exceptionResponse 
              ? (exceptionResponse as any).details 
              : undefined,
          },
          timestamp: new Date().toISOString(),
        };
      } else {
        // Try to handle as Prisma error first
        try {
          handlePrismaError(exception);
        } catch (prismaException) {
          if (prismaException instanceof HttpException) {
            return this.catch(prismaException, host);
          }
        }

        // Handle unknown errors
        errorResponse = {
          success: false,
          error: {
            code: ErrorCodes.SYSTEM_ERROR,
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? exception?.stack : undefined,
          },
          timestamp: new Date().toISOString(),
        };
      }

      // Log the error
      this.logError(exception);

      return throwError(() => new RpcException(errorResponse));
    } catch (error) {
      // Fallback error handling
      this.logger.error('Error in RPC exception filter', error);
      return throwError(() => new RpcException({
        success: false,
        error: {
          code: ErrorCodes.SYSTEM_ERROR,
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
      }));
    }
  }

  private getDefaultErrorCode(status: number): string {
    switch (status) {
      case 400:
        return ErrorCodes.VALIDATION_ERROR;
      case 401:
        return ErrorCodes.UNAUTHORIZED;
      case 403:
        return ErrorCodes.FORBIDDEN;
      case 404:
        return ErrorCodes.RESOURCE_NOT_FOUND;
      case 409:
        return ErrorCodes.DUPLICATE_RESOURCE;
      case 503:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return ErrorCodes.SYSTEM_ERROR;
    }
  }

  private logError(exception: any): void {
    const message = exception instanceof Error ? exception.message : 'Unknown RPC error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (exception instanceof RpcException || exception instanceof HttpException) {
      this.logger.warn(`RPC Error: ${message}`);
    } else {
      this.logger.error(`RPC Error: ${message}`, stack);
    }
  }
}