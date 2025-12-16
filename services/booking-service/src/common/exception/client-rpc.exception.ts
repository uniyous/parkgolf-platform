import { createErrorResponse, ErrorCodes, ErrorResponse } from './error.enum';
import { RpcException } from '@nestjs/microservices';

export class ClientRpcException extends RpcException {
  public readonly errorCode: ErrorCodes;
  public readonly errorMessage: string;
  public readonly httpStatus?: number;
  public readonly timestamp: string;

  constructor(
    errorCode: ErrorCodes,
    options?: {
      overrideMessage?: string;
      httpStatus?: number;
    },
  ) {
    const errorResponseForSuper: ErrorResponse = createErrorResponse(errorCode, options?.overrideMessage, options?.httpStatus);
    super(errorResponseForSuper);

    this.errorCode = errorResponseForSuper.errorCode;
    this.errorMessage = errorResponseForSuper.errorMessage;
    this.httpStatus = errorResponseForSuper.httpStatus;
    this.timestamp = errorResponseForSuper.timestamp;
  }
}
