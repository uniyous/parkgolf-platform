import { apiClient } from './client';
import { authStorage } from '@/lib/storage';

/**
 * User 응답 DTO - auth-service의 UserResponseDto와 일치
 */
export interface User {
  id: number;
  email: string;
  name: string | null;
  roleCode: string;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  // 추가 사용자 필드
  phoneNumber?: string;
  birthDate?: string;
  lastLoginAt?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber?: string;
  birthDate?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn?: number;
}

export const authApi = {
  login: async (credentials: LoginRequest) => {
    const response = await apiClient.post<AuthResponse>('/api/user/auth/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest) => {
    const response = await apiClient.post<AuthResponse>('/api/user/auth/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get<User>('/api/user/auth/profile');
    return response.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/api/user/auth/logout');
    } catch {
      // Always clear local storage even if API call fails
    }
    authStorage.clearAuth();
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<{ accessToken: string }>('/api/user/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },
};
