/**
 * 에러 코드 체계:
 * - AUTH_xxx: 인증/인가 관련
 * - USER_xxx: 사용자 관련
 * - ADMIN_xxx: 관리자 관련
 * - MENU_xxx: 메뉴 관련
 * - FRIEND_xxx: 친구 관련
 * - MEMBER_xxx: 가맹점 회원 관련
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
// 인증 에러 (AUTH_xxx)
// ============================================
export const AuthErrors = defineErrors({
  INVALID_CREDENTIALS: { code: 'AUTH_001', message: '이메일 또는 비밀번호가 올바르지 않습니다', httpStatus: 401 },
  TOKEN_EXPIRED: { code: 'AUTH_002', message: '토큰이 만료되었습니다', httpStatus: 401 },
  TOKEN_INVALID: { code: 'AUTH_003', message: '유효하지 않은 토큰입니다', httpStatus: 401 },
  REFRESH_TOKEN_EXPIRED: { code: 'AUTH_004', message: '리프레시 토큰이 만료되었습니다', httpStatus: 401 },
  INSUFFICIENT_PERMISSIONS: { code: 'AUTH_005', message: '권한이 부족합니다', httpStatus: 403 },
  ACCOUNT_DISABLED: { code: 'AUTH_006', message: '비활성화된 계정입니다', httpStatus: 403 },
  MISSING_TOKEN: { code: 'AUTH_007', message: '인증 토큰이 필요합니다', httpStatus: 401 },
});

// ============================================
// 사용자 에러 (USER_xxx)
// ============================================
export const UserErrors = defineErrors({
  NOT_FOUND: { code: 'USER_001', message: '사용자를 찾을 수 없습니다', httpStatus: 404 },
  EMAIL_EXISTS: { code: 'USER_002', message: '이미 등록된 이메일입니다', httpStatus: 409 },
  PHONE_EXISTS: { code: 'USER_003', message: '이미 등록된 전화번호입니다', httpStatus: 409 },
  INACTIVE: { code: 'USER_004', message: '비활성화된 사용자입니다', httpStatus: 403 },
  DELETION_ACTIVE_BOOKING: { code: 'USER_005', message: '진행 중인 예약이 있어 계정을 삭제할 수 없습니다', httpStatus: 409 },
  DELETION_PENDING_PAYMENT: { code: 'USER_006', message: '미결제 건이 있어 계정을 삭제할 수 없습니다', httpStatus: 409 },
  DELETION_PENDING_REFUND: { code: 'USER_007', message: '환불 진행 중인 건이 있어 계정을 삭제할 수 없습니다', httpStatus: 409 },
  DELETION_ALREADY_REQUESTED: { code: 'USER_008', message: '이미 계정 삭제가 요청된 상태입니다', httpStatus: 409 },
  DELETION_NOT_REQUESTED: { code: 'USER_009', message: '계정 삭제 요청이 없습니다', httpStatus: 400 },
  INVALID_PASSWORD: { code: 'USER_010', message: '비밀번호가 올바르지 않습니다', httpStatus: 401 },
});

// ============================================
// 관리자 에러 (ADMIN_xxx)
// ============================================
export const AdminErrors = defineErrors({
  NOT_FOUND: { code: 'ADMIN_001', message: '관리자를 찾을 수 없습니다', httpStatus: 404 },
  EMAIL_EXISTS: { code: 'ADMIN_002', message: '이미 등록된 관리자 이메일입니다', httpStatus: 409 },
  INACTIVE: { code: 'ADMIN_003', message: '비활성화된 관리자입니다', httpStatus: 403 },
  INVALID_ROLE: { code: 'ADMIN_004', message: '유효하지 않은 관리자 역할입니다', httpStatus: 400 },
});

// ============================================
// 친구 에러 (FRIEND_xxx)
// ============================================
export const FriendErrors = defineErrors({
  REQUEST_NOT_FOUND: { code: 'FRIEND_001', message: '친구 요청을 찾을 수 없습니다', httpStatus: 404 },
  SELF_REQUEST: { code: 'FRIEND_002', message: '자기 자신에게 친구 요청을 보낼 수 없습니다', httpStatus: 400 },
  ALREADY_FRIEND: { code: 'FRIEND_003', message: '이미 친구입니다', httpStatus: 409 },
  ALREADY_REQUESTED: { code: 'FRIEND_004', message: '이미 친구 요청을 보냈습니다', httpStatus: 409 },
  ALREADY_PROCESSED: { code: 'FRIEND_005', message: '이미 처리된 요청입니다', httpStatus: 400 },
  NO_PERMISSION: { code: 'FRIEND_006', message: '이 요청을 처리할 권한이 없습니다', httpStatus: 403 },
});

// ============================================
// 메뉴 에러 (MENU_xxx)
// ============================================
export const MenuErrors = defineErrors({
  NOT_FOUND: { code: 'MENU_001', message: '메뉴를 찾을 수 없습니다', httpStatus: 404 },
  INVALID_PARAMS: { code: 'MENU_002', message: '메뉴 조회 파라미터가 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 가맹점 회원 에러 (MEMBER_xxx)
// ============================================
export const CompanyMemberErrors = defineErrors({
  NOT_FOUND: { code: 'MEMBER_001', message: '가맹점 회원을 찾을 수 없습니다', httpStatus: 404 },
  ALREADY_EXISTS: { code: 'MEMBER_002', message: '이미 등록된 회원입니다', httpStatus: 409 },
});

// ============================================
// 유효성 검증 에러 (VAL_xxx)
// ============================================
export const ValidationErrors = defineErrors({
  INVALID_INPUT: { code: 'VAL_001', message: '입력값이 올바르지 않습니다', httpStatus: 400 },
  MISSING_FIELD: { code: 'VAL_002', message: '필수 항목이 누락되었습니다', httpStatus: 400 },
  INVALID_FORMAT: { code: 'VAL_003', message: '형식이 올바르지 않습니다', httpStatus: 400 },
  INVALID_EMAIL: { code: 'VAL_004', message: '이메일 형식이 올바르지 않습니다', httpStatus: 400 },
  INVALID_PHONE: { code: 'VAL_005', message: '전화번호 형식이 올바르지 않습니다', httpStatus: 400 },
});

// ============================================
// 외부 API 에러 (EXT_xxx)
// ============================================
export const ExternalErrors = defineErrors({
  UNAVAILABLE: { code: 'EXT_001', message: '외부 서비스에 연결할 수 없습니다', httpStatus: 503 },
  TIMEOUT: { code: 'EXT_002', message: '외부 서비스 응답 시간 초과', httpStatus: 504 },
  ERROR: { code: 'EXT_003', message: '외부 서비스 오류', httpStatus: 502 },
  PAYMENT_FAILED: { code: 'EXT_004', message: '결제 처리에 실패했습니다', httpStatus: 502 },
  SMS_FAILED: { code: 'EXT_005', message: 'SMS 발송에 실패했습니다', httpStatus: 502 },
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
  MAINTENANCE: { code: 'SYS_005', message: '서비스 점검 중입니다', httpStatus: 503 },
});

// ============================================
// 통합 export
// ============================================
export const Errors = {
  Auth: AuthErrors,
  User: UserErrors,
  Admin: AdminErrors,
  Menu: MenuErrors,
  Friend: FriendErrors,
  CompanyMember: CompanyMemberErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
