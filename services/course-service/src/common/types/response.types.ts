/**
 * NATS 응답 타입
 */

import { ClubStatus } from '@prisma/client';

// ===== 타입 =====

/** 페이지네이션 */
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 단일 응답 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/** 페이지네이션 응답 */
export interface PaginatedResponse<T> extends ApiResponse<T[]>, Pagination {}

// ===== 타입 가드 =====

export const isWrapped = (v: unknown): v is ApiResponse<unknown> =>
  typeof v === 'object' && v !== null && 'success' in v;

export const isPaginated = (
  v: unknown,
): v is { data: unknown[]; total: number; page: number; limit: number } =>
  typeof v === 'object' &&
  v !== null &&
  'data' in v &&
  'total' in v &&
  'page' in v &&
  'limit' in v;

export const hasData = (v: unknown): v is { data: unknown } =>
  typeof v === 'object' && v !== null && 'data' in v;

// ===== 응답 빌더 =====

export const NatsResponse = {
  success: <T>(data: T): ApiResponse<T> => ({ success: true, data }),

  paginated: <T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> => ({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }),

  deleted: () => ({ success: true, data: { deleted: true } }) as const,
} as const;

// 타입 별칭 (하위 호환)
export type PaginationMeta = Pagination;
export type DeleteResponse = ReturnType<typeof NatsResponse.deleted>;

// ===== NATS 페이로드 =====

export interface CompanyPayload {
  companyId?: number;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}

export interface ClubPayload {
  id?: number;
  companyId?: number;
  query?: string;
  search?: string;
  location?: string;
  status?: ClubStatus;
  page?: number;
  limit?: number;
  data?: unknown;
  updateClubDto?: unknown;
  token?: string;
}

export interface CoursePayload {
  courseId?: number;
  companyId?: number;
  clubId?: number;
  page?: number;
  limit?: number;
  data?: unknown;
  token?: string;
}

export interface HolePayload {
  courseId?: number;
  holeId?: number;
  holeNumber?: number;
  par?: number;
  data?: {
    holeNumber: number;
    par: number;
    distance: number;
    handicap?: number;
  };
  token?: string;
}
