import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { login as loginAction, logout as logoutAction, register as registerAction, clearError } from '../redux/slices/authSlice';

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const auth = useAppSelector((state) => state.auth);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const result = await dispatch(loginAction({ email, password })).unwrap();
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }, [dispatch]);

  const register = useCallback(async (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) => {
    try {
      const result = await dispatch(registerAction(data)).unwrap();
      return true;
    } catch (error) {
      console.error('Register error:', error);
      return false;
    }
  }, [dispatch]);

  const logout = useCallback(() => {
    dispatch(logoutAction());
    navigate('/login');
  }, [dispatch, navigate]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  return {
    user: auth.user,
    token: auth.token,
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    error: auth.error,
    login,
    register,
    logout,
    clearError: clearAuthError,
  };
};