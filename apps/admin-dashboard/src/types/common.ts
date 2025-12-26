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
 */
export type BffErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'SERVICE_UNAVAILABLE'
  | 'LOGIN_FAILED'
  | 'REFRESH_FAILED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  | 'MISSING_TOKEN'
  | 'INSUFFICIENT_PRIVILEGES';
