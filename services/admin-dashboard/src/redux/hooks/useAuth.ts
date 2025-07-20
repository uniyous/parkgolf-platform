import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../hooks';
import { login as loginThunk, logout as logoutAction, clearError, checkAuthStatus } from '../slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector((state) => state.auth);

  const login = useCallback(async (email: string, password: string) => {
    try {
      await dispatch(loginThunk({ email, password })).unwrap();
      return { success: true };
    } catch (error) {
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

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    logout,
    clearError: clearAuthError,
    checkAuth,
  };
};