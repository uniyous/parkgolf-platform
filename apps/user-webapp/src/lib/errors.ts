/**
 * 통합 에러 처리 유틸리티
 *
 * admin-dashboard, user-webapp에서 동일한 구조를 사용합니다.
 * - ApiError: API 요청 실패 시 발생하는 에러
 * - ValidationError: 클라이언트 유효성 검증 실패
 * - 에러 타입 가드 및 변환 유틸리티
 * - Toast 알림 헬퍼
 */

import { toast } from 'sonner';
import { getErrorMessage } from '@/types/common';

// ============================================
// 에러 클래스 정의
// ============================================

/**
 * API 요청 에러
 * HTTP 요청 실패, 서버 에러, 인증 에러 등
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;
  public readonly isApiError = true;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;

    // Error 클래스 상속 시 프로토타입 체인 유지
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * 사용자 친화적 메시지 반환
   */
  getUserMessage(): string {
    if (this.code) {
      return getErrorMessage(this.code, this.message);
    }
    return this.message;
  }

  /**
   * 에러 유형 확인
   */
  isAuthError(): boolean {
    return this.status === 401 || this.code?.startsWith('AUTH_') || false;
  }

  isValidationError(): boolean {
    return this.status === 400 || this.code?.startsWith('VAL_') || false;
  }

  isNotFoundError(): boolean {
    return this.status === 404;
  }

  isServerError(): boolean {
    return this.status >= 500;
  }

  isNetworkError(): boolean {
    return this.status === 0;
  }
}

/**
 * 클라이언트 유효성 검증 에러
 */
export class ValidationError extends Error {
  public readonly field?: string;
  public readonly details?: Record<string, string>;
  public readonly isValidationError = true;

  constructor(message: string, field?: string, details?: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.details = details;

    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

// ============================================
// 타입 가드
// ============================================

/**
 * ApiError 인스턴스인지 확인
 */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError || (error as ApiError)?.isApiError === true;
}

/**
 * ValidationError 인스턴스인지 확인
 */
export function isValidationError(error: unknown): error is ValidationError {
  return (
    error instanceof ValidationError || (error as ValidationError)?.isValidationError === true
  );
}

/**
 * 네트워크 에러인지 확인
 */
export function isNetworkError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isNetworkError();
  }
  return error instanceof TypeError && error.message.includes('fetch');
}

/**
 * 인증 에러인지 확인
 */
export function isAuthError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.isAuthError();
  }
  return false;
}

// ============================================
// 에러 변환 유틸리티
// ============================================

/**
 * 알 수 없는 에러를 ApiError로 변환
 */
export function toApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    // TypeError (fetch 실패 등)
    if (error instanceof TypeError) {
      return new ApiError('네트워크 연결을 확인해주세요.', 0, 'SYS_001');
    }

    return new ApiError(
      error.message || '알 수 없는 오류가 발생했습니다.',
      500,
      'SYS_001'
    );
  }

  // 문자열 에러
  if (typeof error === 'string') {
    return new ApiError(error, 500, 'SYS_001');
  }

  return new ApiError('알 수 없는 오류가 발생했습니다.', 500, 'SYS_001');
}

/**
 * 에러에서 사용자 메시지 추출
 */
export function getErrorUserMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.getUserMessage();
  }

  if (isValidationError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return '오류가 발생했습니다.';
}

// ============================================
// Toast 알림 헬퍼
// ============================================

/**
 * 에러 토스트 표시
 */
export function showErrorToast(error: unknown, fallbackMessage?: string): void {
  const message = getErrorUserMessage(error) || fallbackMessage || '오류가 발생했습니다.';

  // 네트워크 에러
  if (isNetworkError(error)) {
    toast.error('네트워크 오류', {
      description: '인터넷 연결을 확인해주세요.',
    });
    return;
  }

  // 인증 에러 (401은 자동 리다이렉트되므로 토스트 생략)
  if (isAuthError(error)) {
    const apiError = error as ApiError;
    if (apiError.status !== 401) {
      toast.error('인증 오류', {
        description: message,
      });
    }
    return;
  }

  // 일반 에러
  toast.error(message);
}

/**
 * 성공 토스트 표시
 */
export function showSuccessToast(message: string, description?: string): void {
  toast.success(message, {
    description,
  });
}

/**
 * 경고 토스트 표시
 */
export function showWarningToast(message: string, description?: string): void {
  toast.warning(message, {
    description,
  });
}

/**
 * 정보 토스트 표시
 */
export function showInfoToast(message: string, description?: string): void {
  toast.info(message, {
    description,
  });
}

// ============================================
// API 결과 처리 헬퍼
// ============================================

/**
 * API 호출 래퍼 - 에러를 일관되게 처리
 */
export async function handleApiCall<T>(
  apiCall: () => Promise<T>,
  options?: {
    showSuccessToast?: boolean;
    successMessage?: string;
    showErrorToast?: boolean;
    errorMessage?: string;
    onSuccess?: (data: T) => void;
    onError?: (error: ApiError) => void;
  }
): Promise<{ success: true; data: T } | { success: false; error: ApiError }> {
  const {
    showSuccessToast: showSuccess = false,
    successMessage,
    showErrorToast: showError = true,
    errorMessage,
    onSuccess,
    onError,
  } = options || {};

  try {
    const data = await apiCall();

    if (showSuccess && successMessage) {
      showSuccessToast(successMessage);
    }

    onSuccess?.(data);

    return { success: true, data };
  } catch (error) {
    const apiError = toApiError(error);

    if (showError) {
      showErrorToast(apiError, errorMessage);
    }

    onError?.(apiError);

    return { success: false, error: apiError };
  }
}

// ============================================
// 에러 코드 상수 (자주 사용되는 것들)
// ============================================

export const ErrorCodes = {
  // 인증
  AUTH_INVALID_CREDENTIALS: 'AUTH_001',
  AUTH_TOKEN_EXPIRED: 'AUTH_002',
  AUTH_INVALID_TOKEN: 'AUTH_003',
  AUTH_REFRESH_EXPIRED: 'AUTH_004',
  AUTH_INSUFFICIENT_PERMISSION: 'AUTH_005',
  AUTH_ACCOUNT_DISABLED: 'AUTH_006',
  AUTH_TOKEN_REQUIRED: 'AUTH_007',

  // 유효성 검증
  VAL_INVALID_INPUT: 'VAL_001',
  VAL_MISSING_REQUIRED: 'VAL_002',
  VAL_INVALID_FORMAT: 'VAL_003',

  // 시스템
  SYS_INTERNAL_ERROR: 'SYS_001',
  SYS_SERVICE_UNAVAILABLE: 'SYS_002',
  SYS_TIMEOUT: 'SYS_003',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
