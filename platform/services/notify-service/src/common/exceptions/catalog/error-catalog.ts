/**
 * 에러 코드 체계:
 * - AUTH_xxx: 인증/인가 관련
 * - USER_xxx: 사용자 관련
 * - ADMIN_xxx: 관리자 관련
 * - BOOK_xxx: 예약 관련
 * - COURSE_xxx: 코스 관련
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
// 예약 에러 (BOOK_xxx)
// ============================================
export const BookingErrors = defineErrors({
  NOT_FOUND: { code: 'BOOK_001', message: '예약을 찾을 수 없습니다', httpStatus: 404 },
  SLOT_UNAVAILABLE: { code: 'BOOK_002', message: '해당 시간대는 예약할 수 없습니다', httpStatus: 409 },
  ALREADY_CANCELLED: { code: 'BOOK_003', message: '이미 취소된 예약입니다', httpStatus: 400 },
  CANCEL_DEADLINE_PASSED: { code: 'BOOK_004', message: '취소 가능 시간이 지났습니다', httpStatus: 400 },
  MAX_EXCEEDED: { code: 'BOOK_005', message: '최대 예약 가능 횟수를 초과했습니다', httpStatus: 400 },
  INVALID_DATE: { code: 'BOOK_006', message: '유효하지 않은 예약 날짜입니다', httpStatus: 400 },
  PAST_DATE: { code: 'BOOK_007', message: '과거 날짜는 예약할 수 없습니다', httpStatus: 400 },
});

// ============================================
// 코스 에러 (COURSE_xxx)
// ============================================
export const CourseErrors = defineErrors({
  NOT_FOUND: { code: 'COURSE_001', message: '코스를 찾을 수 없습니다', httpStatus: 404 },
  CLUB_NOT_FOUND: { code: 'COURSE_002', message: '클럽을 찾을 수 없습니다', httpStatus: 404 },
  HOLE_NOT_FOUND: { code: 'COURSE_003', message: '홀을 찾을 수 없습니다', httpStatus: 404 },
  GAME_NOT_FOUND: { code: 'COURSE_004', message: '게임을 찾을 수 없습니다', httpStatus: 404 },
  SCHEDULE_NOT_FOUND: { code: 'COURSE_005', message: '스케줄을 찾을 수 없습니다', httpStatus: 404 },
  TIMESLOT_NOT_FOUND: { code: 'COURSE_006', message: '타임슬롯을 찾을 수 없습니다', httpStatus: 404 },
  INACTIVE: { code: 'COURSE_007', message: '비활성화된 코스입니다', httpStatus: 400 },
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
// 알림 에러 (NOTI_xxx)
// ============================================
export const NotificationErrors = defineErrors({
  NOT_FOUND: { code: 'NOTI_001', message: '알림을 찾을 수 없습니다', httpStatus: 404 },
  SEND_FAILED: { code: 'NOTI_002', message: '알림 발송에 실패했습니다', httpStatus: 500 },
  TEMPLATE_NOT_FOUND: { code: 'NOTI_003', message: '알림 템플릿을 찾을 수 없습니다', httpStatus: 404 },
  INVALID_TYPE: { code: 'NOTI_004', message: '유효하지 않은 알림 타입입니다', httpStatus: 400 },
  DELIVERY_FAILED: { code: 'NOTI_005', message: '알림 전달에 실패했습니다', httpStatus: 500 },
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
  Booking: BookingErrors,
  Course: CourseErrors,
  Notification: NotificationErrors,
  Validation: ValidationErrors,
  External: ExternalErrors,
  Database: DatabaseErrors,
  System: SystemErrors,
} as const;
