import { HttpException } from '@nestjs/common';
import { ErrorDef } from './catalog/error-catalog';

/**
 * 표준 에러 응답 형식
 */
export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * 애플리케이션 표준 예외 클래스
 *
 * 사용 예시:
 * - throw new AppException(Errors.Partner.CONFIG_NOT_FOUND);
 * - throw new AppException(Errors.Partner.SYNC_FAILED, '슬롯 동기화 실패: timeout');
 */
export class AppException extends HttpException {
  public readonly code: string;
  public readonly timestamp: string;

  constructor(errorDef: ErrorDef, customMessage?: string) {
    const response: StandardErrorResponse = {
      success: false,
      error: {
        code: errorDef.code,
        message: customMessage || errorDef.message,
      },
      timestamp: new Date().toISOString(),
    };

    super(response, errorDef.httpStatus);
    this.code = errorDef.code;
    this.timestamp = response.timestamp;
  }

  toRpcError(): StandardErrorResponse {
    return this.getResponse() as StandardErrorResponse;
  }

  getCode(): string {
    return this.code;
  }

  getErrorMessage(): string {
    return (this.getResponse() as StandardErrorResponse).error.message;
  }
}
