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
import { authStorage } from '@/lib/storage';
import type { AuthResponse, LoginCredentials, User } from '@/types';

export const iamApi = {
  /**
   * 로그인
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<unknown>('/admin/iam/login', credentials);
    const authData = extractSingle<AuthResponse>(response.data);

    if (!authData) {
      throw new Error('Invalid login response');
    }

    // 토큰 및 사용자 정보 저장
    if (authData.accessToken) {
      authStorage.setAuth(authData.accessToken, authData.refreshToken, authData.user);
    }

    return authData;
  },

  /**
   * 프로필 조회
   */
  async fetchUserProfile(): Promise<User> {
    const response = await apiClient.get<unknown>('/admin/iam/profile');
    const user = extractSingle<User>(response.data);

    if (!user) {
      throw new Error('Invalid profile response');
    }

    return user;
  },

  /**
   * 현재 사용자 조회
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<unknown>('/admin/iam/me');
      const user = extractSingle<User>(response.data);

      if (!user) {
        throw new Error('Failed to get current user');
      }

      // 사용자 정보 캐시 업데이트
      authStorage.setUser(user);

      return user;
    } catch (error) {
      // API 실패 시 캐시된 사용자 정보 확인
      const cachedUser = authStorage.getUser<User>();
      if (cachedUser) {
        return cachedUser;
      }
      throw error;
    }
  },

  /**
   * 토큰 갱신
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await apiClient.post<unknown>('/admin/iam/refresh', {
      refreshToken,
    });
    const authData = extractSingle<AuthResponse>(response.data);

    if (!authData) {
      throw new Error('Invalid refresh response');
    }

    return authData;
  },

  /**
   * 로그아웃
   */
  async logout(): Promise<void> {
    try {
      await apiClient.post('/admin/iam/logout');
    } catch {
      // API 호출 실패해도 로컬 정리 진행
    } finally {
      authStorage.clearAuth();
    }
  },
} as const;

// Legacy exports for backward compatibility
export const authApi = iamApi;
export const login = iamApi.login;
export const fetchUserProfile = iamApi.fetchUserProfile;
