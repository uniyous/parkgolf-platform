import { apiClient, type BffApiResponse } from './client';
import type { AuthResponse, LoginCredentials, User } from "../types";

// Auth Service 직접 연결을 위한 클라이언트
const AUTH_SERVICE_BASE_URL = (import.meta as any).env?.VITE_AUTH_API_BASE_URL || 'http://localhost:3011';

class AuthServiceClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    // 헤더 설정
    const token = localStorage.getItem('accessToken');
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async getProfile(): Promise<User> {
    return this.request<User>('/auth/profile');
  }
}

const authServiceClient = new AuthServiceClient(AUTH_SERVICE_BASE_URL);

export const authApi = {
  async login(credentials: LoginCredentials): Promise<BffApiResponse<AuthResponse>> {
    try {
      console.log('Attempting login with auth-service directly:', credentials.email);
      const response = await apiClient.post<AuthResponse>('/admin/auth/login', credentials);
      
      // 토큰 저장
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        
        // 사용자 정보도 캐시에 저장 (getCurrentUser 실패 시 사용)
        if (response.data.user) {
          localStorage.setItem('currentUser', JSON.stringify(response.data.user));
        }
      }
      
      console.log('Login successful:', response.data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Login failed:', error);
      
      return {
        success: false,
        error: {
          code: 'LOGIN_FAILED',
          message: error instanceof Error ? error.message : 'Login failed'
        }
      };
    }
  },

  async fetchUserProfile(): Promise<BffApiResponse<User>> {
    try {
      const response = await apiClient.get<User>('/admin/auth/profile');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      return {
        success: false,
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: error instanceof Error ? error.message : 'Failed to fetch user profile'
        }
      };
    }
  },

  async getCurrentUser(): Promise<BffApiResponse<User>> {
    try {
      // BFF API를 통해 프로필 정보 가져오기 (auth-service는 이제 NATS로만 통신)
      console.log('Fetching user profile from admin-api...');
      const response = await apiClient.get<User>('/admin/auth/me');
      console.log('Successfully fetched user profile:', response.data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to get current user from admin-api:', error);
      
      // Admin API 실패 시 localStorage에서 사용자 정보 확인
      const cachedUser = localStorage.getItem('currentUser');
      if (cachedUser) {
        try {
          const user = JSON.parse(cachedUser);
          console.log('Using cached user data:', user);
          return {
            success: true,
            data: user
          };
        } catch (parseError) {
          console.error('Failed to parse cached user data:', parseError);
        }
      }
      
      return {
        success: false,
        error: {
          code: 'GET_USER_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get current user'
        }
      };
    }
  },

  async refreshToken(refreshToken: string): Promise<BffApiResponse<AuthResponse>> {
    try {
      const response = await apiClient.post<AuthResponse>('/admin/auth/refresh', { 
        refreshToken 
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Token refresh failed:', error);
      return {
        success: false,
        error: {
          code: 'REFRESH_FAILED',
          message: error instanceof Error ? error.message : 'Token refresh failed'
        }
      };
    }
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/admin/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
      // Continue with local cleanup even if API call fails
    } finally {
      // Always clear local storage
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentUser');
    }
  }
} as const;

// Legacy exports for backward compatibility
export const login = authApi.login;
export const fetchUserProfile = authApi.fetchUserProfile;