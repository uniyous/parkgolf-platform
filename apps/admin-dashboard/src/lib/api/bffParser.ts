/**
 * BFF API 응답 파싱 유틸리티
 *
 * 백엔드에서 다양한 형식으로 응답이 올 수 있으므로 통일된 파싱 로직 제공
 */

import type { Pagination } from '@/types/common';
import { getErrorMessage } from '@/types/common';
import { ApiError } from '@/lib/errors';

// ============================================
// 타입 정의
// ============================================

export interface PaginatedResult<T> {
  data: T[];
  pagination: Pagination;
}

export interface BffResponse<T = unknown> {
  success?: boolean;
  data?: T | T[] | { [key: string]: T[] };
  items?: T[];
  total?: number;
  totalCount?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  message?: string;
  error?: { code?: string; message?: string; details?: Record<string, unknown> } | string;
  [key: string]: unknown;
}

// ============================================
// BFF 응답 언래핑
// ============================================

/**
 * BFF API 응답에서 data를 추출하고 에러를 처리합니다.
 *
 * @param response API 응답 데이터
 * @returns 추출된 데이터
 * @throws ApiError 응답이 실패인 경우
 */
export function unwrapResponse<T>(response: BffResponse<T>): T {
  if (response.success === false) {
    const error = response.error;
    const errorCode = typeof error === 'object' ? error?.code : undefined;
    const errorMessage = typeof error === 'object'
      ? getErrorMessage(errorCode, error?.message)
      : getErrorMessage(undefined, typeof error === 'string' ? error : '오류가 발생했습니다');
    const errorDetails = typeof error === 'object' ? error?.details : undefined;

    throw new ApiError(errorMessage, 400, errorCode, errorDetails);
  }

  return response.data as T;
}

// ============================================
// 리스트 데이터 추출
// ============================================

/**
 * BFF 응답에서 배열 데이터를 추출합니다.
 *
 * 지원하는 응답 형식:
 * - { success: true, data: { [itemKey]: [...] } }
 * - { success: true, data: [...] }
 * - { [itemKey]: [...] }
 * - [...] (직접 배열)
 * - { data: [...] }
 * - { items: [...] }
 *
 * @param response API 응답 데이터
 * @param itemKey 배열이 담긴 키 (예: 'admins', 'companies', 'clubs')
 * @returns 추출된 배열
 */
export function extractList<T>(
  response: unknown,
  itemKey?: string
): T[] {
  if (!response) return [];

  const data = response as BffResponse<T>;

  // 1. 직접 배열인 경우
  if (Array.isArray(response)) {
    return response as T[];
  }

  // 2. data 필드 확인
  if (data.data !== undefined) {
    // 2-1. data가 배열인 경우: { data: [...] }
    if (Array.isArray(data.data)) {
      return data.data as T[];
    }

    // 2-2. data가 객체이고 itemKey가 있는 경우: { data: { [itemKey]: [...] } }
    if (itemKey && typeof data.data === 'object' && data.data !== null) {
      const nested = data.data as Record<string, unknown>;
      if (Array.isArray(nested[itemKey])) {
        return nested[itemKey] as T[];
      }
    }

    // 2-3. data가 객체이고 items 필드가 있는 경우: { data: { items: [...] } }
    if (typeof data.data === 'object' && data.data !== null) {
      const nested = data.data as Record<string, unknown>;
      if (Array.isArray(nested.items)) {
        return nested.items as T[];
      }
    }
  }

  // 3. items 필드 확인: { items: [...] }
  if (Array.isArray(data.items)) {
    return data.items as T[];
  }

  // 4. itemKey로 직접 접근: { [itemKey]: [...] }
  if (itemKey && Array.isArray((data as Record<string, unknown>)[itemKey])) {
    return (data as Record<string, unknown>)[itemKey] as T[];
  }

  return [];
}

// ============================================
// 페이지네이션 정보 추출
// ============================================

/**
 * BFF 응답에서 페이지네이션 정보를 추출합니다.
 */
export function extractPagination(
  response: unknown,
  dataLength: number,
  defaults: Partial<Pagination> = {}
): Pagination {
  const data = response as BffResponse;

  const page = data?.page ?? defaults.page ?? 1;
  const limit = data?.limit ?? defaults.limit ?? 20;
  const total = data?.total ?? data?.totalCount ?? defaults.total ?? dataLength;
  const totalPages = data?.totalPages ?? defaults.totalPages ?? (Math.ceil(total / limit) || 1);

  return { page, limit, total, totalPages };
}

// ============================================
// 페이지네이션 포함 리스트 추출
// ============================================

/**
 * BFF 응답에서 배열 데이터와 페이지네이션 정보를 함께 추출합니다.
 *
 * @param response API 응답 데이터
 * @param itemKey 배열이 담긴 키
 * @param defaults 기본 페이지네이션 값
 * @returns 데이터 배열과 페이지네이션 정보
 */
export function extractPaginatedList<T>(
  response: unknown,
  itemKey?: string,
  defaults: Partial<Pagination> = {}
): PaginatedResult<T> {
  const items = extractList<T>(response, itemKey);
  const pagination = extractPagination(response, items.length, defaults);

  return { data: items, pagination };
}

// ============================================
// 단일 아이템 추출
// ============================================

/**
 * BFF 응답에서 단일 아이템을 추출합니다.
 *
 * 지원하는 응답 형식:
 * - { success: true, data: {...} }
 * - { data: {...} }
 * - {...} (직접 객체)
 */
export function extractSingle<T>(
  response: unknown,
  itemKey?: string
): T | null {
  if (!response) return null;

  const data = response as BffResponse<T>;

  // 1. data 필드 확인
  if (data.data !== undefined) {
    // 1-1. data가 객체이고 itemKey가 있는 경우
    if (itemKey && typeof data.data === 'object' && data.data !== null && !Array.isArray(data.data)) {
      const nested = data.data as Record<string, unknown>;
      if (nested[itemKey]) {
        return nested[itemKey] as T;
      }
    }

    // 1-2. data가 직접 객체인 경우
    if (typeof data.data === 'object' && !Array.isArray(data.data)) {
      return data.data as T;
    }
  }

  // 2. itemKey로 직접 접근
  if (itemKey && (data as Record<string, unknown>)[itemKey]) {
    return (data as Record<string, unknown>)[itemKey] as T;
  }

  // 3. response 자체가 데이터인 경우 (success, data, message 등의 메타 필드만 없으면)
  const metaKeys = ['success', 'data', 'message', 'error', 'total', 'page', 'limit', 'totalPages'];
  const responseKeys = Object.keys(data);
  const hasOnlyMetaKeys = responseKeys.every(key => metaKeys.includes(key));

  if (!hasOnlyMetaKeys && typeof response === 'object' && !Array.isArray(response)) {
    return response as T;
  }

  return null;
}

// ============================================
// 성공 여부 확인
// ============================================

/**
 * BFF 응답이 성공인지 확인합니다.
 */
export function isSuccess(response: unknown): boolean {
  if (!response) return false;

  const data = response as BffResponse;

  // success 필드가 명시적으로 있는 경우
  if (typeof data.success === 'boolean') {
    return data.success;
  }

  // error 필드가 없고 data가 있으면 성공으로 간주
  if (!data.error && (data.data !== undefined || Array.isArray(response))) {
    return true;
  }

  return true; // 기본값은 성공
}

// ============================================
// 에러 메시지 추출
// ============================================

/**
 * BFF 응답에서 에러 메시지를 추출합니다.
 */
export function extractError(response: unknown): string | null {
  if (!response) return null;

  const data = response as BffResponse;

  if (data.error) {
    if (typeof data.error === 'string') {
      return data.error;
    }
    return data.error.message || JSON.stringify(data.error);
  }

  if (data.message && data.success === false) {
    return data.message;
  }

  return null;
}

// ============================================
// 기본 내보내기
// ============================================

export const bffParser = {
  unwrapResponse,
  extractList,
  extractPaginatedList,
  extractPagination,
  extractSingle,
  isSuccess,
  extractError,
};

export default bffParser;
