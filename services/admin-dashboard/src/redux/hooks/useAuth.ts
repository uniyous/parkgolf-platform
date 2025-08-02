import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { 
  login as loginThunk, 
  logout as logoutAction, 
  clearError, 
  checkAuthStatus, 
  getCurrentUser 
} from '../slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { currentAdmin, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const login = useCallback(async (email: string, password: string) => {
    try {
      // 로그인 요청
      await dispatch(loginThunk({ email, password })).unwrap();
      
      // 로그인 성공 후 최신 사용자 정보 가져오기 (실패해도 로그인은 성공으로 처리)
      try {
        await dispatch(getCurrentUser()).unwrap();
        console.log('getCurrentUser success after login');
      } catch (getUserError) {
        console.warn('getCurrentUser failed after login, but login was successful:', getUserError);
        // getCurrentUser 실패해도 로그인은 성공으로 처리
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: error as string };
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logoutAction());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const checkAuth = useCallback(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  const refreshCurrentUser = useCallback(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  return {
    user: currentAdmin, // 호환성을 위해 user로도 노출
    currentAdmin,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError: clearAuthError,
    checkAuth,
    refreshCurrentUser,
  };
};