import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { authKeys } from './keys';
import type { LoginCredentials, AuthResponse } from '@/types';

interface ProfileResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
  };
}

// Login Mutation (로컬 로딩 사용 - LoginForm에서 자체 로딩 처리)
export const useLogin = () => {
  const { hydrateFromLogin, setLoading, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async (credentials: LoginCredentials) => {
      const response = await apiClient.post<any>('/admin/auth/login', credentials);
      const result = response.data;

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || '로그인 응답이 올바르지 않습니다.');
      }

      return result.data as AuthResponse;
    },
    onMutate: () => {
      setLoading(true);
      setError(null);
    },
    onSuccess: (data) => {
      localStorage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }
      hydrateFromLogin(data.user, data.accessToken);
    },
    onError: (error: Error) => {
      setLoading(false);
      setError(error.message || '로그인에 실패했습니다.');
    },
  });
};

// Logout Mutation (로컬 로딩 사용)
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { logout } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      try {
        await apiClient.post('/admin/auth/logout');
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    },
    onSuccess: () => {
      logout();
      queryClient.clear();
    },
  });
};

// Get Current User / Profile Query (로컬 로딩 사용)
export const useGetCurrentUser = () => {
  const { hydrateFromProfile, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        throw new Error('No access token found');
      }

      const response = await apiClient.get<ProfileResponse>('/admin/auth/me');
      const result = response.data;

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Failed to get current user');
      }

      return { user: result.data, token };
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
export const useRefreshToken = () => {
  const { setToken, setError } = useAuthStore();

  return useMutation({
    meta: { globalLoading: false }, // 로컬 로딩 사용
    mutationFn: async () => {
      const refreshToken = localStorage.getItem('refreshToken');

      if (!refreshToken) {
        throw new Error('No refresh token found');
      }

      const response = await apiClient.post<any>('/admin/auth/refresh', {
        refreshToken,
      });

      const result = response.data;

      if (!result.success || !result.data) {
        throw new Error(result.error?.message || 'Token refresh failed');
      }

      return result.data as AuthResponse;
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
export const useCheckAuthStatus = () => {
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
