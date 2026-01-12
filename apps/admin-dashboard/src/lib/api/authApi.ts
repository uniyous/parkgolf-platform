/**
 * IAM API - BFF 통합 클라이언트
 *
 * BFF: /api/admin/iam
 * - Login/Logout
 * - Profile
 * - Token Refresh
 */

import { apiClient } from './client';
import { extractSingle } from './bffParser';
import type { ApiResponse } from '@/types/common';
import type { AuthResponse, LoginCredentials, User } from "@/types";

export const iamApi = {
  async login(credentials: LoginCredentials): Promise<ApiResponse<AuthResponse>> {
    try {
      console.log('Attempting login with iam-service:', credentials.email);
      const response = await apiClient.post<unknown>('/admin/iam/login', credentials);
      const authData = extractSingle<AuthResponse>(response.data);

      if (!authData) {
        throw new Error('Invalid login response');
      }

      // 토큰 저장
      if (authData.accessToken) {
        localStorage.setItem('accessToken', authData.accessToken);
        localStorage.setItem('refreshToken', authData.refreshToken);

        // 사용자 정보도 캐시에 저장 (getCurrentUser 실패 시 사용)
        if (authData.user) {
          localStorage.setItem('currentUser', JSON.stringify(authData.user));
        }
      }

      console.log('Login successful:', authData);
      return {
        success: true,
        data: authData
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
      const response = await apiClient.get<unknown>('/admin/iam/profile');
      const user = extractSingle<User>(response.data);

      if (!user) {
        throw new Error('Invalid profile response');
      }

      return {
        success: true,
        data: user
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
      // BFF API를 통해 프로필 정보 가져오기 (iam-service는 NATS로 통신)
      console.log('Fetching user profile from admin-api...');
      const response = await apiClient.get<unknown>('/admin/iam/me');
      const user = extractSingle<User>(response.data);

      if (!user) {
        throw new Error('Failed to get current user');
      }

      console.log('Successfully fetched user profile:', user);

      // localStorage에 사용자 정보 캐시 업데이트
      localStorage.setItem('currentUser', JSON.stringify(user));

      return {
        success: true,
        data: user
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
      const response = await apiClient.post<unknown>('/admin/iam/refresh', {
        refreshToken
      });
      const authData = extractSingle<AuthResponse>(response.data);

      if (!authData) {
        throw new Error('Invalid refresh response');
      }

      return {
        success: true,
        data: authData
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
      await apiClient.post('/admin/iam/logout');
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
export const authApi = iamApi;  // Alias for backward compatibility
export const login = iamApi.login;
export const fetchUserProfile = iamApi.fetchUserProfile;
