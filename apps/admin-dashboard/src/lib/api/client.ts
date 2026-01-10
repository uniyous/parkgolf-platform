// 통합된 API 클라이언트 - BFF API 연동
import type { ApiResponse, PaginatedResponse } from '@/types/common';
import { getErrorMessage } from '@/types/common';
import { ApiError } from '@/lib/errors';

// ApiError를 re-export하여 기존 import 호환성 유지
export { ApiError };

// 개발/E2E 환경에서는 Vite 프록시 사용 (CORS 우회)
// 프로덕션에서는 환경변수 URL 또는 기본 Cloud Run URL 사용
const mode = (import.meta as any).env?.MODE;
const isDev = mode === 'development' || mode === 'e2e';
const SERVER_URL = isDev
  ? ''  // Vite 프록시 사용
  : ((import.meta as any).env?.VITE_API_URL || 'https://admin-api-dev-iihuzmuufa-du.a.run.app');
const API_BASE_URL = `${SERVER_URL}/api`;

// API 응답 타입 re-export
export type { ApiResponse, PaginatedResponse };

// API Client 내부 응답 타입
export interface ClientResponse<T> {
  data: T;
  message?: string;
  status: number;
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<ClientResponse<T>> {
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
    const token = localStorage.getItem('accessToken');
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
      if (response.status === 204 || response.headers.get("content-length") === "0") {
        return {
          data: undefined as T,
          status: response.status,
        };
      }

      const responseData: any = await response.json();
      
      // BFF API 에러 응답 형식 확인: { success: false, error: { code, message } }
      if ('success' in responseData && !responseData.success && responseData.error) {
        const errorCode = responseData.error.code;
        const errorMessage = getErrorMessage(errorCode, responseData.error.message);
        throw new ApiError(
          errorMessage,
          response.status,
          errorCode,
          responseData.error.details
        );
      }
      
      // auth-service 직접 응답 처리 (성공한 경우)
      return {
        data: responseData as T,
        status: response.status,
        message: responseData.message,
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
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      errorData = { 
        message: response.statusText || 'An error occurred'
      };
    }

    // 에러 응답에서 code와 message 추출
    let errorCode: string;
    let errorMessage: string;
    let errorDetails: any;

    if ('success' in errorData && errorData.error) {
      // BFF API 에러 형식: { success: false, error: { code, message } }
      errorCode = errorData.error.code;
      errorMessage = getErrorMessage(errorCode, errorData.error.message);
      errorDetails = errorData.error.details;
    } else {
      // 기타 에러 형식
      errorCode = errorData.error?.code || 'UNKNOWN_ERROR';
      errorMessage = getErrorMessage(errorCode, errorData.message || errorData.error?.message || 'An error occurred');
      errorDetails = errorData.error?.details;
    }

    const apiError = new ApiError(
      errorMessage,
      response.status,
      errorCode,
      errorDetails
    );

    // 인증 에러 처리
    if (response.status === 401) {
      localStorage.removeItem('accessToken');
      
      // 로그인 페이지로 리다이렉트 (한 번만)
      if (typeof window !== 'undefined' && 
          !window.location.pathname.includes('/login') && 
          !sessionStorage.getItem('redirecting_to_login')) {
        sessionStorage.setItem('redirecting_to_login', 'true');
        setTimeout(() => {
          sessionStorage.removeItem('redirecting_to_login');
        }, 1000);
        window.location.href = '/login';
      }
    }

    throw apiError;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: any): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ClientResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

// 레거시 호환성을 위한 기본 export
export default function apiClientFunction<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  
  switch (method.toUpperCase()) {
    case 'GET':
      return apiClient.get<T>(endpoint, options.params).then(response => response.data);
    case 'POST':
      return apiClient.post<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined).then(response => response.data);
    case 'PUT':
      return apiClient.put<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined).then(response => response.data);
    case 'PATCH':
      return apiClient.patch<T>(endpoint, options.body ? JSON.parse(options.body as string) : undefined).then(response => response.data);
    case 'DELETE':
      return apiClient.delete<T>(endpoint).then(response => response.data);
    default:
      throw new Error(`Unsupported HTTP method: ${method}`);
  }
}