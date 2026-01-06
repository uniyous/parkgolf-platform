import { useNavigate, useLocation } from 'react-router-dom';
import { useUser, useIsAuthenticated } from '@/stores/authStore';
import { useLoginMutation, useRegisterMutation, useLogoutMutation, useProfileQuery } from './queries/auth';
import type { RegisterRequest } from '@/lib/api/authApi';

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useUser();
  const isAuthenticated = useIsAuthenticated();

  const loginMutation = useLoginMutation();
  const registerMutation = useRegisterMutation();
  const logoutMutation = useLogoutMutation();

  // Get profile query (only runs if authenticated)
  const { data: profile } = useProfileQuery();

  const login = async (email: string, password: string) => {
    try {
      await loginMutation.mutateAsync({ email, password });

      // 로그인 후 원래 페이지 또는 기본 페이지로 이동
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/search';
      navigate(from, { replace: true });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      await registerMutation.mutateAsync(userData);
      navigate('/search');
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      navigate('/login');
    }
  };

  return {
    user: user || profile,
    isAuthenticated,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    login,
    register,
    logout,
  };
};
