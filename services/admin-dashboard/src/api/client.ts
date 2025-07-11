// 통합된 API 클라이언트 - BFF API 연동
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3091/api';

// BFF API 응답 형식에 맞춘 인터페이스
export interface BffApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code?: string;
  public readonly details?: Record<string, any>;

  constructor(
    message: string,
    status: number,
    code?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
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
      
      // auth-service 직접 응답 처리 (BFF 형식이 아님)
      // BFF API 응답 형식인지 확인
      if ('success' in responseData && !responseData.success && responseData.error) {
        throw new ApiError(
          responseData.error.message,
          response.status,
          responseData.error.code,
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

    // auth-service 에러 형식 처리
    let error: { code: string; message: string; details?: any };
    
    if ('success' in errorData && errorData.error) {
      // BFF API 에러 형식
      error = errorData.error;
    } else {
      // auth-service 직접 에러 형식
      error = {
        code: errorData.error?.code || 'UNKNOWN_ERROR',
        message: errorData.message || errorData.error?.message || 'An error occurred',
        details: errorData.error?.details
      };
    }

    const apiError = new ApiError(
      error.message,
      response.status,
      error.code,
      error.details
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

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
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