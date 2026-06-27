/**
 * 에러 코드 체계:
 * - JOB_xxx: 배치 작업 관련
 * - AUTH_xxx: 인증/인가 관련
 * - VAL_xxx: 유효성 검증
 * - EXT_xxx: 외부 API 에러
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
  INSUFFICIENT_PERMISSIONS: { code: 'AUTH_005', message: '권한이 부족합니다', httpStatus: 403 },
});

// ============================================
// 배치 작업 에러 (JOB_xxx)
// ============================================
export const JobErrors = defineErrors({
  EXECUTION_FAILED: { code: 'JOB_001', message: '배치 작업 실행에 실패했습니다', httpStatus: 500 },
  NATS_TIMEOUT: { code: 'JOB_002', message: 'NATS 요청 시간이 초과되었습니다', httpStatus: 504 },
  JOB_NOT_FOUND: { code: 'JOB_003', message: '등록되지 않은 배치 작업입니다', httpStatus: 404 },
});

// ============================================
// 유효성 검증 에러 (VAL_xxx)
// ============================================
export const ValidationErrors = defineErrors({
  INVALID_INPUT: { code: 'VAL_001', message: '입력값이 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 외부 API 에러 (EXT_xxx)
// ============================================
export const ExternalErrors = defineErrors({
  UNAVAILABLE: { code: 'EXT_001', message: '외부 서비스에 연결할 수 없습니다', httpStatus: 503 },
  TIMEOUT: { code: 'EXT_002', message: '외부 서비스 응답 시간 초과', httpStatus: 504 },
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
  Job: JobErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  System: SystemErrors,
} as const;
