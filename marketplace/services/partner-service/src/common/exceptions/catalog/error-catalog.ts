/**
 * 에러 코드 체계:
 * - PARTNER_xxx: 파트너 연동 관련
 * - AUTH_xxx: 인증/인가 관련
 * - VAL_xxx: 유효성 검증
 * - EXT_xxx: 외부 API 에러
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
// 파트너 에러 (PARTNER_xxx)
// ============================================
export const PartnerErrors = defineErrors({
  CONFIG_NOT_FOUND: { code: 'PARTNER_001', message: '파트너 설정을 찾을 수 없습니다', httpStatus: 404 },
  CONFIG_ALREADY_EXISTS: { code: 'PARTNER_002', message: '해당 골프장의 파트너 설정이 이미 존재합니다', httpStatus: 409 },
  CONFIG_INACTIVE: { code: 'PARTNER_003', message: '비활성화된 파트너입니다', httpStatus: 400 },
  COURSE_MAPPING_NOT_FOUND: { code: 'PARTNER_004', message: '코스 매핑을 찾을 수 없습니다', httpStatus: 404 },
  SLOT_MAPPING_NOT_FOUND: { code: 'PARTNER_005', message: '슬롯 매핑을 찾을 수 없습니다', httpStatus: 404 },
  BOOKING_MAPPING_NOT_FOUND: { code: 'PARTNER_006', message: '예약 매핑을 찾을 수 없습니다', httpStatus: 404 },
  CONNECTION_TEST_FAILED: { code: 'PARTNER_007', message: '외부 API 연결 테스트에 실패했습니다', httpStatus: 502 },
  SPEC_LOAD_FAILED: { code: 'PARTNER_008', message: 'OpenAPI 스펙 로딩에 실패했습니다', httpStatus: 502 },
  SYNC_FAILED: { code: 'PARTNER_009', message: '동기화에 실패했습니다', httpStatus: 500 },
  SLOT_CONFLICT: { code: 'PARTNER_010', message: '슬롯 재고 충돌이 발생했습니다', httpStatus: 409 },
  EXTERNAL_API_ERROR: { code: 'PARTNER_011', message: '외부 API 호출 중 오류가 발생했습니다', httpStatus: 502 },
  CIRCUIT_OPEN: { code: 'PARTNER_012', message: '외부 API 서킷 브레이커 OPEN 상태입니다', httpStatus: 503 },
  INVALID_SPEC: { code: 'PARTNER_013', message: 'OpenAPI 스펙이 유효하지 않습니다', httpStatus: 400 },
  DECRYPTION_FAILED: { code: 'PARTNER_014', message: 'API 키 복호화에 실패했습니다', httpStatus: 500 },
});

// ============================================
// 인증 에러 (AUTH_xxx)
// ============================================
export const AuthErrors = defineErrors({
  INVALID_CREDENTIALS: { code: 'AUTH_001', message: '이메일 또는 비밀번호가 올바르지 않습니다', httpStatus: 401 },
  TOKEN_EXPIRED: { code: 'AUTH_002', message: '토큰이 만료되었습니다', httpStatus: 401 },
  TOKEN_INVALID: { code: 'AUTH_003', message: '유효하지 않은 토큰입니다', httpStatus: 401 },
  INSUFFICIENT_PERMISSIONS: { code: 'AUTH_005', message: '권한이 부족합니다', httpStatus: 403 },
});

// ============================================
// 유효성 검증 에러 (VAL_xxx)
// ============================================
export const ValidationErrors = defineErrors({
  INVALID_INPUT: { code: 'VAL_001', message: '입력값이 올바르지 않습니다', httpStatus: 400 },
  MISSING_FIELD: { code: 'VAL_002', message: '필수 항목이 누락되었습니다', httpStatus: 400 },
  INVALID_FORMAT: { code: 'VAL_003', message: '형식이 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 외부 API 에러 (EXT_xxx)
// ============================================
export const ExternalErrors = defineErrors({
  UNAVAILABLE: { code: 'EXT_001', message: '외부 서비스에 연결할 수 없습니다', httpStatus: 503 },
  TIMEOUT: { code: 'EXT_002', message: '외부 서비스 응답 시간 초과', httpStatus: 504 },
  ERROR: { code: 'EXT_003', message: '외부 서비스 오류', httpStatus: 502 },
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
  Partner: PartnerErrors,
  Auth: AuthErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
