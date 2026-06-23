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
  }

  toRpcError(): StandardErrorResponse {
    return this.getResponse() as StandardErrorResponse;
  }
}
