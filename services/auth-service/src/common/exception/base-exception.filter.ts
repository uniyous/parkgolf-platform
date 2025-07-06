import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponse, ErrorCodes } from '../types/error-response.type';
import { handlePrismaError } from '../utils/prisma-error.handler';

@Catch()
export class BaseExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(BaseExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorResponse: ErrorResponse;

    try {
      // Handle different types of exceptions
      if (exception instanceof HttpException) {
        status = exception.getStatus();
        const exceptionResponse = exception.getResponse();
        
        errorResponse = {
          success: false,
          error: {
            code: typeof exceptionResponse === 'object' && 'code' in exceptionResponse 
              ? (exceptionResponse as any).code 
              : this.getDefaultErrorCode(status),
            message: typeof exceptionResponse === 'string' 
              ? exceptionResponse 
              : (exceptionResponse as any).message || exception.message,
            details: typeof exceptionResponse === 'object' && 'details' in exceptionResponse 
              ? (exceptionResponse as any).details 
              : undefined,
          },
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
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
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        errorResponse = {
          success: false,
          error: {
            code: ErrorCodes.SYSTEM_ERROR,
            message: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? (exception as Error).stack : undefined,
          },
          timestamp: new Date().toISOString(),
          path: request.url,
          method: request.method,
        };
      }

      // Log the error
      this.logError(exception, request, status);

      response.status(status).json(errorResponse);
    } catch (error) {
      // Fallback error handling
      this.logger.error('Error in exception filter', error);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: {
          code: ErrorCodes.SYSTEM_ERROR,
          message: 'Internal server error',
        },
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      });
    }
  }

  private getDefaultErrorCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_ERROR;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.RESOURCE_NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCodes.DUPLICATE_RESOURCE;
      case HttpStatus.SERVICE_UNAVAILABLE:
        return ErrorCodes.SERVICE_UNAVAILABLE;
      default:
        return ErrorCodes.SYSTEM_ERROR;
    }
  }

  private logError(exception: unknown, request: Request, status: HttpStatus): void {
    const message = exception instanceof Error ? exception.message : 'Unknown error';
    const stack = exception instanceof Error ? exception.stack : undefined;

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status} - ${message}`,
        stack,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} - ${message}`,
      );
    }
  }
}