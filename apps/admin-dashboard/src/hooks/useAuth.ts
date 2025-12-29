import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useAuthStore,
  useCurrentAdmin,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
  initializeAuthFromStorage,
} from '@/stores';
import {
  useLoginMutation,
  useLogoutMutation,
  useGetCurrentUserMutation,
} from './queries';
import type { LoginCredentials, Permission, AdminRole } from '@/types';

/**
 * Auth hook - 인증 관련 모든 기능을 제공하는 통합 hook
 *
 * @example
 * const { currentAdmin, isAuthenticated, login, logout, hasPermission } = useAuth();
 *
 * // 로그인
 * await login({ email: 'admin@example.com', password: 'password' });
 *
 * // 권한 체크
 * if (hasPermission('MANAGE_USERS')) { ... }
 */
export const useAuth = () => {
  // Store state
  const currentAdmin = useCurrentAdmin();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();
  const error = useAuthError();

  // Store actions
  const { clearError } = useAuthStore();

  // Mutations
  const loginMutation = useLoginMutation();
  const logoutMutation = useLogoutMutation();
  const getCurrentUserMutation = useGetCurrentUserMutation();

  // Login handler
  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        await loginMutation.mutateAsync(credentials);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : '로그인에 실패했습니다.',
        };
      }
    },
    [loginMutation]
  );

  // Logout handler
  const logout = useCallback(async () => {
    await logoutMutation.mutateAsync();
  }, [logoutMutation]);

  // Refresh user data from API
  const refreshUser = useCallback(async () => {
    await getCurrentUserMutation.mutateAsync();
  }, [getCurrentUserMutation]);

  // Permission helpers (from store)
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canManageAdminRole = useAuthStore((state) => state.canManageAdminRole);
  const canAccessCompany = useAuthStore((state) => state.canAccessCompany);
  const canAccessCourse = useAuthStore((state) => state.canAccessCourse);
  const getDisplayInfo = useAuthStore((state) => state.getDisplayInfo);

  return {
    // State
    currentAdmin,
    isAuthenticated,
    isLoading: isLoading || loginMutation.isPending || logoutMutation.isPending,
    error,

    // Actions
    login,
    logout,
    refreshUser,
    clearError,

    // Permission helpers
    hasPermission,
    canManageAdminRole,
    canAccessCompany,
    canAccessCourse,
    getDisplayInfo,
  };
};

/**
 * Auth initialization hook - App 시작 시 인증 상태 초기화
 *
 * @example
 * // App.tsx에서 사용
 * const { isInitializing } = useAuthInitialize();
 */
export const useAuthInitialize = () => {
  const getCurrentUserMutation = useGetCurrentUserMutation();
  const isAuthenticated = useIsAuthenticated();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeAuth = async () => {
      // First, try to hydrate from localStorage
      const hasStoredAuth = initializeAuthFromStorage();

      if (hasStoredAuth) {
        // If we have stored auth, fetch fresh data from API
        console.log('Token found, fetching current user from API');
        try {
          await getCurrentUserMutation.mutateAsync();
        } catch (error) {
          console.log('Failed to refresh user from API, using cached data');
        }
      } else {
        console.log('No stored auth found, user needs to login');
      }

      setIsInitialized(true);
    };

    initializeAuth();
  }, []); // Run only once on mount

  // 초기화 완료 전이거나 API 호출 중이면 로딩 상태
  return { isInitializing: !isInitialized || getCurrentUserMutation.isPending };
};

/**
 * Protected route hook - 인증 상태를 확인하고 미인증 시 리다이렉트
 *
 * @example
 * // PrivateRoute에서 사용
 * const { isAuthenticated, isLoading } = useProtectedRoute();
 */
export const useProtectedRoute = (redirectTo: string = '/login') => {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const isLoading = useAuthLoading();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  return { isAuthenticated, isLoading };
};

/**
 * Permission guard hook - 특정 권한이 있는지 확인
 *
 * @example
 * const canManageUsers = useHasPermission('MANAGE_USERS');
 */
export const useHasPermission = (permission: Permission): boolean => {
  return useAuthStore((state) => state.hasPermission(permission));
};

/**
 * Admin role check hook - 관리자 역할 관리 가능 여부 확인
 *
 * @example
 * const canManage = useCanManageRole('STAFF');
 */
export const useCanManageRole = (targetRole: AdminRole): boolean => {
  return useAuthStore((state) => state.canManageAdminRole(targetRole));
};

// Default export for convenience
export default useAuth;
