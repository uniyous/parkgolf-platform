/**
 * Common Response Utilities
 * NATS 응답 유틸리티 함수
 */

/**
 * 페이지네이션 메타 타입
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 성공 응답 타입
 */
export interface SuccessResponse<T> {
  success: true;
  data: T;
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
}

/**
 * 에러 응답 타입
 */
export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, meta?: Partial<PaginationMeta>): SuccessResponse<T> {
  return {
    success: true,
    data,
    ...meta,
  };
}

/**
 * 에러 응답 생성
 */
export function errorResponse(code: string, message: string, details?: unknown): ErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
}

/**
 * 페이지네이션 메타 데이터 생성
 */
export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 날짜를 ISO 문자열로 변환 (null-safe)
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}
