/**
 * 통합 API 클라이언트
 *
 * admin-dashboard, user-webapp에서 동일한 구조를 사용합니다.
 * - Fetch API 기반
 * - 자동 토큰 갱신
 * - 표준 에러 처리
 */

import type { ApiResponse, PaginatedResponse } from '@/types/common';
import { getErrorMessage } from '@/types/common';
import { ApiError } from '@/lib/errors';
import { authStorage } from '@/lib/storage';

// ApiError를 re-export하여 기존 import 호환성 유지
export { ApiError };

// API 응답 타입 re-export
export type { ApiResponse, PaginatedResponse };

// ============================================
// 환경 설정
// ============================================

const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';

// 개발/E2E 환경에서는 Vite 프록시 사용 (CORS 우회)
// 프로덕션에서는 환경변수 URL 또는 기본 Cloud Run URL 사용
const SERVER_URL = isDev
  ? '' // Vite 프록시 사용
  : (import.meta as any).env?.VITE_API_URL ||
    'https://admin-api-dev-iihuzmuufa-du.a.run.app';
const API_BASE_URL = `${SERVER_URL}/api`;

// 토큰 갱신 엔드포인트
const REFRESH_ENDPOINT = '/admin/iam/refresh';

// ============================================
// 타입 정의
// ============================================

/** API Client 응답 타입 */
export interface ClientResponse<T> {
  data: T;
  message?: string;
  status: number;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

// ============================================
// API Client 클래스
// ============================================

class ApiClient {
  private baseURL: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<ClientResponse<T>> {
    const { params, ...fetchOptions } = options;
    let url = `${this.baseURL}${endpoint}`;

    // Query parameters 처리
    if (params) {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      if (queryParams.toString()) {
        url += `?${queryParams.toString()}`;
      }
    }

    // 헤더 설정
    const token = authStorage.getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...fetchOptions.headers,
    };

    try {
      const response = await fetch(url, { ...fetchOptions, headers });

      if (!response.ok) {
        await this.handleErrorResponse(response, endpoint, options);
      }

      // 응답 본문이 없는 경우 처리
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {
          data: undefined as T,
          status: response.status,
        };
      }

      const responseData: unknown = await response.json();

      // BFF API 에러 응답 형식 확인: { success: false, error: { code, message } }
      if (
        typeof responseData === 'object' &&
        responseData !== null &&
        'success' in responseData &&
        !(responseData as { success: boolean }).success &&
        'error' in responseData
      ) {
        const errorResponse = responseData as {
          success: false;
          error: { code: string; message: string; details?: Record<string, unknown> };
        };
        const errorCode = errorResponse.error.code;
        const errorMessage = getErrorMessage(errorCode, errorResponse.error.message);
        throw new ApiError(
          errorMessage,
          response.status,
          errorCode,
          errorResponse.error.details
        );
      }

      return {
        data: responseData as T,
        status: response.status,
        message: (responseData as { message?: string }).message,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error(`API call failed: ${endpoint}`, error);
      throw new ApiError('Network error occurred', 0);
    }
  }

  private async handleErrorResponse(
    response: Response,
    endpoint: string,
    options: RequestOptions
  ): Promise<never> {
    let errorData: {
      success?: boolean;
      message?: string;
      error?: { code?: string; message?: string; details?: Record<string, unknown> };
    };
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        message: response.statusText || 'An error occurred',
      };
    }

    // 에러 응답에서 code와 message 추출
    let errorCode: string | undefined;
    let errorMessage: string;
    let errorDetails: Record<string, unknown> | undefined;

    if ('success' in errorData && errorData.error) {
      // BFF API 에러 형식: { success: false, error: { code, message } }
      errorCode = errorData.error.code;
      errorMessage = getErrorMessage(errorCode, errorData.error.message);
      errorDetails = errorData.error.details;
    } else {
      // 기타 에러 형식
      errorCode = errorData.error?.code;
      errorMessage = getErrorMessage(
        errorCode,
        errorData.message || errorData.error?.message || 'An error occurred'
      );
      errorDetails = errorData.error?.details;
    }

    // 인증 에러 처리 (401)
    if (response.status === 401) {
      // refresh 엔드포인트가 아닌 경우에만 토큰 갱신 시도
      if (!endpoint.includes(REFRESH_ENDPOINT) && !endpoint.includes('/iam/refresh')) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // 토큰 갱신 성공 시 원래 요청 재시도하지 않고 에러 throw
          // (caller가 재시도 처리)
        }
      }

      // 토큰 갱신 실패 또는 refresh 엔드포인트 에러
      this.clearAuthAndRedirect();
    }

    throw new ApiError(errorMessage, response.status, errorCode, errorDetails);
  }

  /**
   * 토큰 갱신 시도
   */
  private async tryRefreshToken(): Promise<boolean> {
    // 이미 갱신 중이면 기존 Promise 재사용
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    const refreshToken = authStorage.getRefreshToken();
    if (!refreshToken) {
      return false;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performRefresh(refreshToken);

    try {
      return await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performRefresh(refreshToken: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}${REFRESH_ENDPOINT}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const result = await response.json();
        const data = result.data || result;

        if (data.accessToken) {
          authStorage.setToken(data.accessToken);
          if (data.refreshToken) {
            authStorage.setRefreshToken(data.refreshToken);
          }
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * 인증 정보 삭제 및 로그인 페이지로 리다이렉트
   */
  private clearAuthAndRedirect(): void {
    authStorage.clearAuth();

    if (
      typeof window !== 'undefined' &&
      !window.location.pathname.includes('/login') &&
      !sessionStorage.getItem('redirecting_to_login')
    ) {
      sessionStorage.setItem('redirecting_to_login', 'true');
      setTimeout(() => {
        sessionStorage.removeItem('redirecting_to_login');
      }, 1000);
      window.location.href = '/login';
    }
  }

  // ============================================
  // HTTP 메서드
  // ============================================

  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

// ============================================
// Export
// ============================================

export const apiClient = new ApiClient(API_BASE_URL);

// 레거시 호환성을 위한 기본 export
export default function apiClientFunction<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = options.method || 'GET';

  switch (method.toUpperCase()) {
    case 'GET':
      return apiClient.get<T>(endpoint, options.params).then((response) => response.data);
    case 'POST':
      return apiClient
        .post<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined)
        .then((response) => response.data);
    case 'PUT':
      return apiClient
        .put<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined)
        .then((response) => response.data);
    case 'PATCH':
      return apiClient
        .patch<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined)
        .then((response) => response.data);
    case 'DELETE':
      return apiClient.delete<T>(endpoint).then((response) => response.data);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}
