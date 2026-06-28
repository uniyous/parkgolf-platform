import { PgProviderError, PgErrorCode } from '@uniyous/pg-provider';
import { AppException, Errors, ErrorDef } from '../common/exceptions';

/** 정규화 PgErrorCode → payment-service 에러 카탈로그 */
const MAP: Record<PgErrorCode, ErrorDef> = {
  ALREADY_PROCESSED: Errors.Payment.PG_ALREADY_PROCESSED,
  INVALID_CARD: Errors.Payment.PG_INVALID_CARD,
  EXCEED_LIMIT: Errors.Payment.PG_EXCEED_LIMIT,
  INSUFFICIENT_BALANCE: Errors.Payment.PG_INSUFFICIENT_BALANCE,
  NOT_FOUND: Errors.Payment.PG_NOT_FOUND,
  ALREADY_CANCELLED: Errors.Payment.PG_ALREADY_CANCELLED,
  EXCEED_CANCEL_AMOUNT: Errors.Payment.PG_EXCEED_CANCEL_AMOUNT,
  UNAVAILABLE: Errors.Payment.PG_UNAVAILABLE,
  TIMEOUT: Errors.Payment.PG_TIMEOUT,
  UNKNOWN: Errors.Payment.PG_ERROR,
};

/** 어댑터의 정규화 에러를 payment-service 예외로 매핑 (UnifiedExceptionFilter가 응답화) */
export function pgErrorToAppException(e: PgProviderError): AppException {
  return new AppException(MAP[e.code] ?? Errors.Payment.PG_ERROR, e.message);
}
