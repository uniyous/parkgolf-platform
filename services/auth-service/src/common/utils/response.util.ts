/**
 * Common Response Utilities
 * NATS 응답 및 유틸리티 함수 통합
 */

/**
 * 성공 응답 생성
 */
export function successResponse<T>(data: T, meta?: Record<string, any>) {
  return {
    success: true,
    data,
    ...meta,
  };
}

/**
 * 에러 응답 생성
 */
export function errorResponse(code: string, message: string, details?: any) {
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
export function paginationMeta(total: number, page: number, limit: number) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * 객체에서 password 필드 제거
 */
export function omitPassword<T extends { password?: string }>(obj: T): Omit<T, 'password'> {
  if (!obj) return obj;
  const { password, ...result } = obj;
  return result;
}

/**
 * 배열에서 password 필드 제거
 */
export function omitPasswordFromArray<T extends { password?: string }>(arr: T[]): Omit<T, 'password'>[] {
  return arr.map(omitPassword);
}

/**
 * 날짜를 ISO 문자열로 변환 (null-safe)
 */
export function toISOString(date: Date | null | undefined): string | null {
  return date ? date.toISOString() : null;
}
