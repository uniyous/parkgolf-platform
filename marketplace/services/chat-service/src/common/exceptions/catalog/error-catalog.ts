/**
 * 에러 코드 체계:
 * - CHAT_xxx: 채팅 관련
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
// 채팅 에러 (CHAT_xxx)
// ============================================
export const ChatErrors = defineErrors({
  ROOM_NOT_FOUND: { code: 'CHAT_001', message: '채팅방을 찾을 수 없습니다', httpStatus: 404 },
  MESSAGE_NOT_FOUND: { code: 'CHAT_002', message: '메시지를 찾을 수 없습니다', httpStatus: 404 },
  NOT_AUTHORIZED: { code: 'CHAT_003', message: '권한이 없습니다', httpStatus: 403 },
});

// ============================================
// 인증 에러 (AUTH_xxx)
// ============================================
export const AuthErrors = defineErrors({
  INVALID_CREDENTIALS: { code: 'AUTH_001', message: '이메일 또는 비밀번호가 올바르지 않습니다', httpStatus: 401 },
  INSUFFICIENT_PERMISSIONS: { code: 'AUTH_005', message: '권한이 부족합니다', httpStatus: 403 },
});

// ============================================
// 유효성 검증 에러 (VAL_xxx)
// ============================================
export const ValidationErrors = defineErrors({
  INVALID_INPUT: { code: 'VAL_001', message: '입력값이 올바르지 않습니다', httpStatus: 400 },
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
  Chat: ChatErrors,
  Auth: AuthErrors,
  Validation: ValidationErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
