/**
 * 에러 코드 체계:
 * - AUTH_xxx: 인증/인가 관련
 * - PAY_xxx: 결제 관련
 * - REFUND_xxx: 환불 관련
 * - VAL_xxx: 유효성 검증
 * - EXT_xxx: 외부 API 에러 (토스페이먼츠)
 * - DB_xxx: 데이터베이스 에러
 * - SYS_xxx: 시스템 에러
 */

export interface ErrorDef {
  readonly code: string;
  readonly message: string;
  readonly httpStatus: number;
}

function defineErrors<T extends Record<string, ErrorDef>>(errors: T): Readonly<T> {
  return Object.freeze(errors);
}

// ============================================
// 인증 에러 (AUTH_xxx)
// ============================================
export const AuthErrors = defineErrors({
  INVALID_CREDENTIALS: { code: 'AUTH_001', message: '이메일 또는 비밀번호가 올바르지 않습니다', httpStatus: 401 },
  TOKEN_EXPIRED: { code: 'AUTH_002', message: '토큰이 만료되었습니다', httpStatus: 401 },
  TOKEN_INVALID: { code: 'AUTH_003', message: '유효하지 않은 토큰입니다', httpStatus: 401 },
  INSUFFICIENT_PERMISSIONS: { code: 'AUTH_005', message: '권한이 부족합니다', httpStatus: 403 },
  MISSING_TOKEN: { code: 'AUTH_007', message: '인증 토큰이 필요합니다', httpStatus: 401 },
});

// ============================================
// 결제 에러 (PAY_xxx)
// ============================================
export const PaymentErrors = defineErrors({
  NOT_FOUND: { code: 'PAY_001', message: '결제 정보를 찾을 수 없습니다', httpStatus: 404 },
  ALREADY_CONFIRMED: { code: 'PAY_002', message: '이미 승인된 결제입니다', httpStatus: 400 },
  ALREADY_CANCELLED: { code: 'PAY_003', message: '이미 취소된 결제입니다', httpStatus: 400 },
  AMOUNT_MISMATCH: { code: 'PAY_004', message: '결제 금액이 일치하지 않습니다', httpStatus: 400 },
  INVALID_STATUS: { code: 'PAY_005', message: '결제 상태가 올바르지 않습니다', httpStatus: 400 },
  CONFIRM_FAILED: { code: 'PAY_006', message: '결제 승인에 실패했습니다', httpStatus: 400 },
  CANCEL_FAILED: { code: 'PAY_007', message: '결제 취소에 실패했습니다', httpStatus: 400 },
  EXPIRED: { code: 'PAY_008', message: '결제 유효 시간이 만료되었습니다', httpStatus: 400 },
  INVALID_CARD: { code: 'PAY_009', message: '유효하지 않은 카드입니다', httpStatus: 400 },
  INSUFFICIENT_BALANCE: { code: 'PAY_010', message: '잔액이 부족합니다', httpStatus: 400 },
  EXCEED_LIMIT: { code: 'PAY_011', message: '결제 한도를 초과했습니다', httpStatus: 400 },
});

// ============================================
// 환불 에러 (REFUND_xxx)
// ============================================
export const RefundErrors = defineErrors({
  NOT_FOUND: { code: 'REFUND_001', message: '환불 정보를 찾을 수 없습니다', httpStatus: 404 },
  ALREADY_REFUNDED: { code: 'REFUND_002', message: '이미 환불 처리된 결제입니다', httpStatus: 400 },
  EXCEED_AMOUNT: { code: 'REFUND_003', message: '환불 금액이 결제 금액을 초과합니다', httpStatus: 400 },
  REFUND_FAILED: { code: 'REFUND_004', message: '환불 처리에 실패했습니다', httpStatus: 400 },
  INVALID_ACCOUNT: { code: 'REFUND_005', message: '환불 계좌 정보가 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 빌링 에러 (BILLING_xxx)
// ============================================
export const BillingErrors = defineErrors({
  KEY_NOT_FOUND: { code: 'BILLING_001', message: '빌링키를 찾을 수 없습니다', httpStatus: 404 },
  KEY_ISSUE_FAILED: { code: 'BILLING_002', message: '빌링키 발급에 실패했습니다', httpStatus: 400 },
  KEY_ALREADY_EXISTS: { code: 'BILLING_003', message: '이미 등록된 카드입니다', httpStatus: 409 },
  PAY_FAILED: { code: 'BILLING_004', message: '자동결제에 실패했습니다', httpStatus: 400 },
});

// ============================================
// 분할결제 에러 (SPLIT_xxx)
// ============================================
export const SplitErrors = defineErrors({
  NOT_FOUND: { code: 'SPLIT_001', message: '분할결제 정보를 찾을 수 없습니다', httpStatus: 404 },
  ALREADY_PAID: { code: 'SPLIT_002', message: '이미 결제가 완료되었습니다', httpStatus: 400 },
  EXPIRED: { code: 'SPLIT_003', message: '결제 기한이 만료되었습니다', httpStatus: 400 },
  INVALID_STATUS: { code: 'SPLIT_004', message: '분할결제 상태가 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 유효성 검증 에러 (VAL_xxx)
// ============================================
export const ValidationErrors = defineErrors({
  INVALID_INPUT: { code: 'VAL_001', message: '입력값이 올바르지 않습니다', httpStatus: 400 },
  MISSING_FIELD: { code: 'VAL_002', message: '필수 항목이 누락되었습니다', httpStatus: 400 },
  INVALID_FORMAT: { code: 'VAL_003', message: '형식이 올바르지 않습니다', httpStatus: 400 },
  INVALID_AMOUNT: { code: 'VAL_004', message: '결제 금액이 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 외부 API 에러 (EXT_xxx) - 토스페이먼츠
// ============================================
export const ExternalErrors = defineErrors({
  UNAVAILABLE: { code: 'EXT_001', message: '결제 서비스에 연결할 수 없습니다', httpStatus: 503 },
  TIMEOUT: { code: 'EXT_002', message: '결제 서비스 응답 시간 초과', httpStatus: 504 },
  ERROR: { code: 'EXT_003', message: '결제 서비스 오류', httpStatus: 502 },
  INVALID_API_KEY: { code: 'EXT_004', message: 'API 키가 유효하지 않습니다', httpStatus: 401 },
  WEBHOOK_VERIFICATION_FAILED: { code: 'EXT_005', message: '웹훅 검증에 실패했습니다', httpStatus: 401 },
});

// ============================================
// 데이터베이스 에러 (DB_xxx)
// ============================================
export const DatabaseErrors = defineErrors({
  UNIQUE_VIOLATION: { code: 'DB_001', message: '중복된 데이터입니다', httpStatus: 409 },
  NOT_FOUND: { code: 'DB_002', message: '데이터를 찾을 수 없습니다', httpStatus: 404 },
  FK_VIOLATION: { code: 'DB_003', message: '참조 무결성 위반', httpStatus: 400 },
  CONNECTION_ERROR: { code: 'DB_004', message: '데이터베이스 연결 오류', httpStatus: 503 },
});

// ============================================
// 시스템 에러 (SYS_xxx)
// ============================================
export const SystemErrors = defineErrors({
  INTERNAL: { code: 'SYS_001', message: '내부 서버 오류', httpStatus: 500 },
  UNAVAILABLE: { code: 'SYS_002', message: '서비스를 일시적으로 사용할 수 없습니다', httpStatus: 503 },
  TIMEOUT: { code: 'SYS_003', message: '요청 시간 초과', httpStatus: 408 },
  RATE_LIMIT: { code: 'SYS_004', message: '요청 한도 초과', httpStatus: 429 },
});

// ============================================
// 통합 export
// ============================================
export const Errors = {
  Auth: AuthErrors,
  Payment: PaymentErrors,
  Refund: RefundErrors,
  Billing: BillingErrors,
  Split: SplitErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
