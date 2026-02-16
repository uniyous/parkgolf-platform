import { useMutation, useQueryClient } from '@tanstack/react-query';
import { iamApi } from '@/lib/api/authApi';
import { useAuthStore, type ApiUserResponse, type AuthErrorType } from '@/stores';
import { authKeys } from './keys';
import type { LoginCredentials, AuthResponse } from '@/types';
import { isApiError } from '@/lib/errors';

// Login Mutation (로컬 로딩 사용 - LoginForm에서 자체 로딩 처리)
export const useLoginMutation = () => {
  const { hydrateFromLogin, setLoading, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: (credentials: LoginCredentials) => iamApi.login(credentials),
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      hydrateFromLogin(data.user as ApiUserResponse, data.accessToken);
    },
    onError: (error: Error) => {
      setLoading(false);
      let errorType: AuthErrorType = 'general';
      if (isApiError(error)) {
        if (error.isServerError() || error.isNetworkError()) {
          errorType = 'server';
        } else if (error.isAuthError()) {
          errorType = 'auth';
        }
      }
      setError(error.message || '로그인에 실패했습니다.', errorType);
    },
  });
};

// Logout Mutation (로컬 로딩 사용)
export const useLogoutMutation = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: () => iamApi.logout(),
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
};

// Get Current User / Profile Query (로컬 로딩 사용)
export const useGetCurrentUserMutation = () => {
  const { hydrateFromProfile, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) throw new Error('No access token found');

      const user = await iamApi.getCurrentUser();
      return { user, token };
    },
    onSuccess: (data) => {
      hydrateFromProfile(data.user, data.token);
    },
    onError: (error: Error) => {
      console.error('Failed to get current user:', error);

      const cachedUser = localStorage.getItem('currentUser');
      const token = localStorage.getItem('accessToken');

      if (cachedUser && token) {
        try {
          const user = JSON.parse(cachedUser);
          hydrateFromProfile(user, token);
          return;
        } catch (parseError) {
          console.error('Failed to parse cached user data:', parseError);
        }
      }

      setError(error.message);
    },
  });
};

// Refresh Token Mutation (로컬 로딩 사용 - 백그라운드 처리)
export const useRefreshTokenMutation = () => {
  const { setToken, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('No refresh token found');

      return iamApi.refreshToken(refreshToken);
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      setToken(data.accessToken);
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });
};

// Check Auth Status (from localStorage) - 로컬 로딩 사용
export const useCheckAuthStatusMutation = () => {
  const { hydrateFromLogin, logout } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      const token = localStorage.getItem('accessToken');
      const userStr = localStorage.getItem('currentUser');

      if (!token || !userStr) {
        throw new Error('No authentication found');
      }

      const user = JSON.parse(userStr);
      return { user, token };
    },
    onSuccess: (data) => {
      hydrateFromLogin(data.user, data.token);
    },
    onError: () => {
      logout();
    },
  });
};
