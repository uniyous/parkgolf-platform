// API 클라이언트 - user-api 연동
import { getErrorMessage } from '@/types/common';
import { authStorage } from '@/lib/storage';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3092';

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, unknown>;

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
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
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
        await this.handleErrorResponse(response);
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
        throw new ApiError(errorMessage, response.status, errorCode, errorResponse.error.details);
      }

      return {
        data: responseData as T,
        status: response.status,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      console.error(`API call failed: ${endpoint}`, error);
      throw new ApiError('Network error occurred', 0);
    }
  }

  private async handleErrorResponse(response: Response): Promise<never> {
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
      errorMessage = getErrorMessage(errorCode, errorData.message || errorData.error?.message || '오류가 발생했습니다');
      errorDetails = errorData.error?.details;
    }

    const apiError = new ApiError(errorMessage, response.status, errorCode, errorDetails);

    // 인증 에러 처리
    if (response.status === 401) {
      // Try to refresh token
      const refreshToken = authStorage.getRefreshToken();
      if (refreshToken && !response.url.includes('/auth/refresh')) {
        try {
          const refreshResponse = await fetch(`${this.baseURL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (refreshResponse.ok) {
            const { accessToken } = await refreshResponse.json();
            authStorage.setToken(accessToken);
            // Note: Caller should retry the request
          } else {
            this.clearAuthAndRedirect();
          }
        } catch {
          this.clearAuthAndRedirect();
        }
      } else {
        this.clearAuthAndRedirect();
      }
    }

    throw apiError;
  }

  private clearAuthAndRedirect() {
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

  async get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
