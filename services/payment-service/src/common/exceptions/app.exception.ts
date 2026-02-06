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
 * - throw new AppException(Errors.Payment.NOT_FOUND);
 * - throw new AppException(Errors.Payment.AMOUNT_MISMATCH, '결제 금액: 10000원 예상, 실제: 9000원');
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

  /**
   * RPC 통신용 에러 객체 변환
   */
  toRpcError(): StandardErrorResponse {
    return this.getResponse() as StandardErrorResponse;
  }

  /**
   * 에러 코드 반환
   */
  getCode(): string {
    return this.code;
  }

  /**
   * 에러 메시지 반환
   */
  getErrorMessage(): string {
    return (this.getResponse() as StandardErrorResponse).error.message;
  }
}
