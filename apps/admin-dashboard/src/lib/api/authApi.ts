/**
 * Auth API - BFF 통합 클라이언트
 *
 * BFF: /api/admin/auth
 * - Login/Logout
 * - Profile
 * - Token Refresh
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types/common';
import type { AuthResponse, LoginCredentials, User } from "@/types";

export const authApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
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

  async fetchUserProfile(): Promise<ApiResponse<User>> {
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

  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      // BFF API를 통해 프로필 정보 가져오기 (auth-service는 이제 NATS로만 통신)
      console.log('Fetching user profile from admin-api...');
      const response = await apiClient.get<ApiResponse<User>>('/admin/auth/me');

      // BFF 응답 구조: { success: true, data: {...} } | { success: false, error: {...} }
      const bffResponse = response.data;

      if (!bffResponse.success) {
        throw new Error(bffResponse.error.message || 'Failed to get current user');
      }

      console.log('Successfully fetched user profile:', bffResponse.data);

      // localStorage에 사용자 정보 캐시 업데이트
      localStorage.setItem('currentUser', JSON.stringify(bffResponse.data));

      return {
        success: true,
        data: bffResponse.data
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

  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthResponse>> {
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