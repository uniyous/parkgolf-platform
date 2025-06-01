import { ArgumentsHost, Catch, HttpException, Logger, RpcExceptionFilter } from '@nestjs/common';
import { NatsContext, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';
import { ClientRpcException } from './client-rpc.exception';
import { createErrorResponse, ErrorCodes, ErrorResponse, isErrorMessage } from './error.enum';
import { RpcArgumentsHost } from '@nestjs/common/interfaces';

@Catch()
export class GlobalRpcExceptionFilter implements RpcExceptionFilter<any> {
  private readonly logger = new Logger(GlobalRpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<ErrorResponse> {
    const rpcContext: RpcArgumentsHost = host.switchToRpc();
    const requestData = rpcContext.getData<unknown>();
    const transportContext = rpcContext.getContext<NatsContext>();

    this.logger.error(
      `Exception caught. Type: ${exception?.constructor?.name}, Message: "${(exception as Error)?.message}". Request Data: ${JSON.stringify(requestData)}`,
      (exception as Error)?.stack,
      transportContext,
    );

    let finalErrorResponse: ErrorResponse;

    if (exception instanceof ClientRpcException) {
      finalErrorResponse = exception.getError() as ErrorResponse;
    } else if (exception instanceof RpcException) {
      const rawError = exception.getError();
      this.logger.warn(`Caught a generic RpcException. Error content: ${JSON.stringify(rawError)}`);

      if (typeof rawError === 'string') {
        finalErrorResponse = createErrorResponse(ErrorCodes.SYS_002, rawError);
      } else if (typeof rawError === 'object' && rawError !== null && 'errorCode' in rawError) {
        const rowErrorCode = (rawError as { errorCode: ErrorCodes }).errorCode;
        if (isErrorMessage(rowErrorCode)) {
          const errorObject = rawError as { errorCode: ErrorCodes } & Partial<ErrorResponse>;
          finalErrorResponse = createErrorResponse(rowErrorCode, errorObject.errorMessage, errorObject.httpStatus);
        } else {
          finalErrorResponse = createErrorResponse(ErrorCodes.SYS_002 /* ... */);
        }
      }
    } else if (exception instanceof HttpException) {
      const httpStatus = exception.getStatus();
      const httpMessage = exception.message;

      this.logger.warn(`Caught an HttpException: ${httpStatus} "${httpMessage}"`);

      let errorCodeForHttp: ErrorCodes = ErrorCodes.SYS_002;
      if (httpStatus >= 500) {
        errorCodeForHttp = ErrorCodes.SYS_001;
      } else if (httpStatus === 404) {
        errorCodeForHttp = ErrorCodes.BUS_011;
      } else if (httpStatus === 401 || httpStatus === 403) {
        errorCodeForHttp = ErrorCodes.AUT_006;
      } else if (httpStatus === 400) {
        errorCodeForHttp = ErrorCodes.AUT_003;
      }

      finalErrorResponse = createErrorResponse(errorCodeForHttp, httpMessage, httpStatus);
    } else {
      const errorMessage = (exception as Error)?.message || 'An unexpected internal error occurred.';
      this.logger.error(`Caught an unexpected error: "${errorMessage}"`);
      finalErrorResponse = createErrorResponse(ErrorCodes.SYS_001, errorMessage);
    }

    // this.logger.log(`Responding with error: ${JSON.stringify(finalErrorResponse)}`);
    return throwError(() => finalErrorResponse);
  }
}
