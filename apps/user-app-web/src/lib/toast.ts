/**
 * Toast 알림 유틸리티
 *
 * sonner를 사용한 일관된 토스트 메시지 처리
 */

import { toast } from 'sonner';

/**
 * 성공 토스트 표시
 */
export function showSuccessToast(message: string, description?: string): void {
  toast.success(message, {
    description,
  });
}

/**
 * 에러 토스트 표시
 */
export function showErrorToast(message: string, description?: string): void {
  toast.error(message, {
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

/**
 * 로딩 토스트 (Promise 기반)
 */
export function showLoadingToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: unknown) => string);
  }
): void {
  toast.promise(promise, messages);
}

// 기본 toast 함수도 export
export { toast };
