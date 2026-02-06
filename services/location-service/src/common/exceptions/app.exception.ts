import { HttpStatus } from '@nestjs/common';

export interface ErrorInfo {
  code: string;
  message: string;
  httpStatus: HttpStatus;
}

export class AppException extends Error {
  public readonly code: string;
  public readonly httpStatus: HttpStatus;

  constructor(errorInfo: ErrorInfo, customMessage?: string) {
    super(customMessage || errorInfo.message);
    this.code = errorInfo.code;
    this.httpStatus = errorInfo.httpStatus;
  }
}
