import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ErrorCodes } from '../types/error-response.type';

const logger = new Logger('NatsErrorHandler');

/**
 * NATS 에러를 표준 HttpException으로 변환
 */
export function handleNatsError(error: any, context?: string): HttpException {
  const contextPrefix = context ? `[${context}] ` : '';

  // 이미 HttpException인 경우 그대로 반환
  if (error instanceof HttpException) {
    return error;
  }

  // NATS 타임아웃 에러
  if (error.message?.includes('timeout') || error.name === 'TimeoutError') {
    logger.warn(`${contextPrefix}NATS timeout error`);
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

  // NATS 연결 에러
  if (
    error.code === 'ECONNREFUSED' ||
    error.message?.includes('connection') ||
    error.message?.includes('NATS')
  ) {
    logger.error(`${contextPrefix}NATS connection error: ${error.message}`);
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

  // NATS 서비스에서 반환한 에러 응답
  if (error.success === false && error.error) {
    const statusCode = getStatusCodeFromErrorCode(error.error.code);
    return new HttpException(error, statusCode);
  }

  // 알 수 없는 에러
  logger.error(`${contextPrefix}Unknown error: ${error.message}`, error.stack);
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
function getStatusCodeFromErrorCode(code: string): HttpStatus {
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

  // 문자열 패턴 기반
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
