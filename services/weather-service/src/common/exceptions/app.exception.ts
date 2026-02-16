import { HttpException } from '@nestjs/common';
import { ErrorDef } from './catalog/error-catalog';

export interface StandardErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

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
