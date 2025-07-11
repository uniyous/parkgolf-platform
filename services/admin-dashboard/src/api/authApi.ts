import { apiClient, type BffApiResponse } from './client';
import type { AuthResponse, LoginCredentials, User } from "../types";

export const authApi = {
  async login(credentials: LoginCredentials): Promise<BffApiResponse<AuthResponse>> {
    try {
      console.log('Attempting login with auth-service directly:', credentials.username);
      const response = await apiClient.post<AuthResponse>('/admin/auth/login', credentials);
      
      // 토큰 저장
      if (response.data.accessToken) {
        localStorage.setItem('accessToken', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
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
      const response = await apiClient.get<User>('/admin/auth/me');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to get current user:', error);
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
    }
  }
} as const;

// Legacy exports for backward compatibility
export const login = authApi.login;
export const fetchUserProfile = authApi.fetchUserProfile;