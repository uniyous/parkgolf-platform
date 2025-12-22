/**
 * Common Response Utilities
 * NATS 응답 및 유틸리티 함수 통합
 */
import { randomUUID } from 'crypto';

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
 * 안전한 타임슬롯 ID 생성
 * crypto.randomUUID() 사용으로 충돌 가능성 최소화
 */
export function generateTimeSlotId(): number {
  // UUID의 일부를 숫자로 변환하여 고유 ID 생성
  const uuid = randomUUID();
  // UUID에서 숫자만 추출하여 합산
  const numericPart = uuid.replace(/\D/g, '').slice(0, 10);
  return parseInt(numericPart, 10) || Date.now();
}

/**
 * 날짜를 ISO 문자열로 변환 (null-safe)
 */
export function toISOString(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  if (typeof date === 'string') return date;
  return date.toISOString();
}
