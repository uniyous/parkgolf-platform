import { apiClient } from './client';
import { authStorage } from '@/lib/storage';

/**
 * User 응답 DTO - iam-service의 UserResponseDto와 일치
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
  phone?: string | null;
  profileImageUrl?: string | null;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ChangePasswordResponse {
  message: string;
  passwordChangedAt: string;
}

export interface PasswordExpiryResponse {
  needsChange: boolean;
  daysSinceChange: number | null;
  passwordChangedAt: string | null;
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
    const response = await apiClient.post<AuthResponse>('/api/user/iam/login', credentials);
    return response.data;
  },

  register: async (userData: RegisterRequest) => {
    const response = await apiClient.post<AuthResponse>('/api/user/iam/register', userData);
    return response.data;
  },

  getProfile: async () => {
    const response = await apiClient.get<{ success: boolean; data: User }>('/api/user/iam/profile');
    return response.data.data;
  },

  logout: async () => {
    try {
      await apiClient.post('/api/user/iam/logout');
    } catch {
      // Always clear local storage even if API call fails
    }
    authStorage.clearAuth();
  },

  refreshToken: async (refreshToken: string) => {
    const response = await apiClient.post<{ accessToken: string }>('/api/user/iam/refresh', {
      refreshToken,
    });
    return response.data;
  },

  changePassword: async (data: ChangePasswordRequest) => {
    const response = await apiClient.post<{ success: boolean; data: ChangePasswordResponse }>(
      '/api/user/account/change-password',
      data
    );
    return response.data.data;
  },

  checkPasswordExpiry: async () => {
    const response = await apiClient.get<{ success: boolean; data: PasswordExpiryResponse }>(
      '/api/user/account/password-expiry'
    );
    return response.data.data;
  },
};
