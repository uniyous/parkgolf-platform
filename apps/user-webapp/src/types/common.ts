// ===== 페이지네이션 =====

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ===== API 에러 =====

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ===== API 응답 (Discriminated Union) =====

/** 성공 응답 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/** 에러 응답 */
export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

/** 통합 응답 타입 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/** 페이지네이션 성공 응답 */
export interface PaginatedSuccessResponse<T> extends Pagination {
  success: true;
  data: T[];
}

/** 페이지네이션 통합 응답 타입 */
export type PaginatedResponse<T> = PaginatedSuccessResponse<T> | ApiErrorResponse;

// ===== 타입 가드 =====

export const isSuccess = <T>(res: ApiResponse<T>): res is ApiSuccessResponse<T> =>
  res.success === true;

export const isPaginated = <T>(res: PaginatedResponse<T>): res is PaginatedSuccessResponse<T> =>
  res.success === true;

export const isError = <T>(res: ApiResponse<T> | PaginatedResponse<T>): res is ApiErrorResponse =>
  res.success === false;

// ===== 응답 빌더 (테스트/목업용) =====

export const ApiResponseBuilder = {
  success: <T>(data: T, message?: string): ApiSuccessResponse<T> =>
    message ? { success: true, data, message } : { success: true, data },

  error: (code: string, message: string, details?: Record<string, unknown>): ApiErrorResponse => ({
    success: false,
    error: details ? { code, message, details } : { code, message },
  }),

  paginated: <T>(data: T[], pagination: Pagination): PaginatedSuccessResponse<T> => ({
    success: true,
    data,
    ...pagination,
  }),
} as const;

// ===== 하위 호환 타입 별칭 =====

/** @deprecated ApiResponse<T> 사용 권장 */
export type BffApiResponse<T> = ApiResponse<T>;

/** @deprecated PaginatedResponse<T> 사용 권장 */
export type BffPaginatedResponse<T> = PaginatedResponse<T>;

/**
 * BFF API 에러 코드
 *
 * 에러 코드 체계:
 * - AUTH_xxx: 인증/인가 관련
 * - USER_xxx: 사용자 관련
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
  AUTH_002: '로그인이 만료되었습니다. 다시 로그인해 주세요',
  AUTH_003: '로그인 정보가 유효하지 않습니다. 다시 로그인해 주세요',
  AUTH_004: '세션이 만료되었습니다. 다시 로그인해 주세요',
  AUTH_005: '이 작업을 수행할 권한이 없습니다',
  AUTH_006: '비활성화된 계정입니다. 고객센터에 문의해 주세요',
  AUTH_007: '로그인이 필요합니다',
  // 사용자 에러
  USER_001: '사용자를 찾을 수 없습니다',
  USER_002: '이미 등록된 이메일입니다',
  USER_003: '이미 등록된 전화번호입니다',
  USER_004: '비활성화된 사용자입니다',
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
  COURSE_002: '골프장을 찾을 수 없습니다',
  COURSE_003: '홀을 찾을 수 없습니다',
  COURSE_004: '라운드를 찾을 수 없습니다',
  COURSE_005: '스케줄을 찾을 수 없습니다',
  COURSE_006: '예약 가능한 시간을 찾을 수 없습니다',
  COURSE_007: '현재 이용할 수 없는 코스입니다',
  // 유효성 검증 에러
  VAL_001: '입력값이 올바르지 않습니다',
  VAL_002: '필수 항목을 입력해 주세요',
  VAL_003: '형식이 올바르지 않습니다',
  VAL_004: '이메일 형식이 올바르지 않습니다',
  VAL_005: '전화번호 형식이 올바르지 않습니다',
  // 외부 API 에러
  EXT_001: '서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요',
  EXT_002: '서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요',
  EXT_003: '서비스 오류가 발생했습니다. 잠시 후 다시 시도해 주세요',
  EXT_004: '결제 처리에 실패했습니다. 다시 시도해 주세요',
  EXT_005: '인증번호 발송에 실패했습니다. 다시 시도해 주세요',
  // 데이터베이스 에러
  DB_001: '이미 등록된 정보입니다',
  DB_002: '요청하신 정보를 찾을 수 없습니다',
  DB_003: '데이터 처리 중 오류가 발생했습니다',
  DB_004: '서비스에 일시적인 문제가 발생했습니다',
  // 시스템 에러
  SYS_001: '서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요',
  SYS_002: '서비스를 일시적으로 사용할 수 없습니다',
  SYS_003: '요청 시간이 초과되었습니다. 다시 시도해 주세요',
  SYS_004: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요',
  SYS_005: '서비스 점검 중입니다. 잠시 후 다시 이용해 주세요',
};

/**
 * 에러 코드를 사용자 친화적 메시지로 변환
 */
export function getErrorMessage(code?: string, fallbackMessage?: string): string {
  if (!code) return fallbackMessage || '오류가 발생했습니다';
  return ERROR_MESSAGES[code] || fallbackMessage || '오류가 발생했습니다';
}
