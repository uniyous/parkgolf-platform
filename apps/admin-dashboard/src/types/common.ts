export interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================
// BFF API Response Types
// ============================================

/**
 * BFF API 표준 응답 형식
 * 모든 admin-api 엔드포인트는 이 형식으로 응답합니다.
 */
export interface BffApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * BFF API 페이지네이션 응답 형식
 */
export interface BffPaginatedResponse<T> {
  success: boolean;
  data?: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

/**
 * BFF API 에러 코드
 *
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
export type BffErrorCode =
  // 인증 에러 (AUTH_xxx)
  | 'AUTH_001' // 이메일 또는 비밀번호가 올바르지 않습니다
  | 'AUTH_002' // 토큰이 만료되었습니다
  | 'AUTH_003' // 유효하지 않은 토큰입니다
  | 'AUTH_004' // 리프레시 토큰이 만료되었습니다
  | 'AUTH_005' // 권한이 부족합니다
  | 'AUTH_006' // 비활성화된 계정입니다
  | 'AUTH_007' // 인증 토큰이 필요합니다
  // 사용자 에러 (USER_xxx)
  | 'USER_001' // 사용자를 찾을 수 없습니다
  | 'USER_002' // 이미 등록된 이메일입니다
  | 'USER_003' // 이미 등록된 전화번호입니다
  | 'USER_004' // 비활성화된 사용자입니다
  // 관리자 에러 (ADMIN_xxx)
  | 'ADMIN_001' // 관리자를 찾을 수 없습니다
  | 'ADMIN_002' // 이미 등록된 관리자 이메일입니다
  | 'ADMIN_003' // 비활성화된 관리자입니다
  | 'ADMIN_004' // 유효하지 않은 관리자 역할입니다
  // 예약 에러 (BOOK_xxx)
  | 'BOOK_001' // 예약을 찾을 수 없습니다
  | 'BOOK_002' // 해당 시간대는 예약할 수 없습니다
  | 'BOOK_003' // 이미 취소된 예약입니다
  | 'BOOK_004' // 취소 가능 시간이 지났습니다
  | 'BOOK_005' // 최대 예약 가능 횟수를 초과했습니다
  | 'BOOK_006' // 유효하지 않은 예약 날짜입니다
  | 'BOOK_007' // 과거 날짜는 예약할 수 없습니다
  // 코스 에러 (COURSE_xxx)
  | 'COURSE_001' // 코스를 찾을 수 없습니다
  | 'COURSE_002' // 클럽을 찾을 수 없습니다
  | 'COURSE_003' // 홀을 찾을 수 없습니다
  | 'COURSE_004' // 게임을 찾을 수 없습니다
  | 'COURSE_005' // 스케줄을 찾을 수 없습니다
  | 'COURSE_006' // 타임슬롯을 찾을 수 없습니다
  | 'COURSE_007' // 비활성화된 코스입니다
  // 유효성 검증 에러 (VAL_xxx)
  | 'VAL_001' // 입력값이 올바르지 않습니다
  | 'VAL_002' // 필수 항목이 누락되었습니다
  | 'VAL_003' // 형식이 올바르지 않습니다
  | 'VAL_004' // 이메일 형식이 올바르지 않습니다
  | 'VAL_005' // 전화번호 형식이 올바르지 않습니다
  // 외부 API 에러 (EXT_xxx)
  | 'EXT_001' // 외부 서비스에 연결할 수 없습니다
  | 'EXT_002' // 외부 서비스 응답 시간 초과
  | 'EXT_003' // 외부 서비스 오류
  | 'EXT_004' // 결제 처리에 실패했습니다
  | 'EXT_005' // SMS 발송에 실패했습니다
  // 데이터베이스 에러 (DB_xxx)
  | 'DB_001' // 중복된 데이터입니다
  | 'DB_002' // 데이터를 찾을 수 없습니다
  | 'DB_003' // 참조 무결성 위반
  | 'DB_004' // 데이터베이스 연결 오류
  // 시스템 에러 (SYS_xxx)
  | 'SYS_001' // 내부 서버 오류
  | 'SYS_002' // 서비스를 일시적으로 사용할 수 없습니다
  | 'SYS_003' // 요청 시간 초과
  | 'SYS_004' // 요청 한도 초과
  | 'SYS_005'; // 서비스 점검 중입니다

/**
 * 에러 코드에 대한 사용자 친화적 메시지 매핑
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // 인증 에러
  AUTH_001: '이메일 또는 비밀번호가 올바르지 않습니다',
  AUTH_002: '토큰이 만료되었습니다. 다시 로그인해 주세요',
  AUTH_003: '유효하지 않은 토큰입니다. 다시 로그인해 주세요',
  AUTH_004: '세션이 만료되었습니다. 다시 로그인해 주세요',
  AUTH_005: '이 작업을 수행할 권한이 없습니다',
  AUTH_006: '비활성화된 계정입니다. 관리자에게 문의하세요',
  AUTH_007: '로그인이 필요합니다',
  // 사용자 에러
  USER_001: '사용자를 찾을 수 없습니다',
  USER_002: '이미 등록된 이메일입니다',
  USER_003: '이미 등록된 전화번호입니다',
  USER_004: '비활성화된 사용자입니다',
  // 관리자 에러
  ADMIN_001: '관리자를 찾을 수 없습니다',
  ADMIN_002: '이미 등록된 관리자 이메일입니다',
  ADMIN_003: '비활성화된 관리자입니다',
  ADMIN_004: '유효하지 않은 관리자 역할입니다',
  // 예약 에러
  BOOK_001: '예약을 찾을 수 없습니다',
  BOOK_002: '해당 시간대는 예약할 수 없습니다',
  BOOK_003: '이미 취소된 예약입니다',
  BOOK_004: '취소 가능 시간이 지났습니다',
  BOOK_005: '최대 예약 가능 횟수를 초과했습니다',
  BOOK_006: '유효하지 않은 예약 날짜입니다',
  BOOK_007: '과거 날짜는 예약할 수 없습니다',
  // 코스 에러
  COURSE_001: '코스를 찾을 수 없습니다',
  COURSE_002: '클럽을 찾을 수 없습니다',
  COURSE_003: '홀을 찾을 수 없습니다',
  COURSE_004: '게임을 찾을 수 없습니다',
  COURSE_005: '스케줄을 찾을 수 없습니다',
  COURSE_006: '타임슬롯을 찾을 수 없습니다',
  COURSE_007: '비활성화된 코스입니다',
  // 유효성 검증 에러
  VAL_001: '입력값이 올바르지 않습니다',
  VAL_002: '필수 항목이 누락되었습니다',
  VAL_003: '형식이 올바르지 않습니다',
  VAL_004: '이메일 형식이 올바르지 않습니다',
  VAL_005: '전화번호 형식이 올바르지 않습니다',
  // 외부 API 에러
  EXT_001: '외부 서비스에 연결할 수 없습니다',
  EXT_002: '외부 서비스 응답 시간이 초과되었습니다',
  EXT_003: '외부 서비스 오류가 발생했습니다',
  EXT_004: '결제 처리에 실패했습니다',
  EXT_005: 'SMS 발송에 실패했습니다',
  // 데이터베이스 에러
  DB_001: '중복된 데이터입니다',
  DB_002: '데이터를 찾을 수 없습니다',
  DB_003: '데이터 참조 오류가 발생했습니다',
  DB_004: '데이터베이스 연결에 실패했습니다',
  // 시스템 에러
  SYS_001: '서버 오류가 발생했습니다',
  SYS_002: '서비스를 일시적으로 사용할 수 없습니다',
  SYS_003: '요청 시간이 초과되었습니다',
  SYS_004: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요',
  SYS_005: '서비스 점검 중입니다',
};

/**
 * 에러 코드를 사용자 친화적 메시지로 변환
 */
export function getErrorMessage(code?: string, fallbackMessage?: string): string {
  if (!code) return fallbackMessage || '오류가 발생했습니다';
  return ERROR_MESSAGES[code] || fallbackMessage || '오류가 발생했습니다';
}
