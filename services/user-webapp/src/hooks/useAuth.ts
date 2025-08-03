import { useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { RootState } from '../redux/store';
import { 
  useLoginMutation, 
  useRegisterMutation, 
  useLogoutMutation,
  useGetProfileQuery,
  RegisterRequest 
} from '../redux/api/authApi';
import { useEffect, useRef } from 'react';

export const useAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useSelector((state: RootState) => state.auth.user);
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  
  const [loginMutation, { isLoading: isLoggingIn }] = useLoginMutation();
  const [registerMutation, { isLoading: isRegistering }] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();
  
  // Get profile query (only runs if authenticated)
  const { data: profile, refetch: refetchProfile } = useGetProfileQuery(undefined, {
    skip: !isAuthenticated,
  });

  const login = async (email: string, password: string) => {
    try {
      const result = await loginMutation({ email, password }).unwrap();
      
      // Redux 상태가 업데이트될 때까지 대기
      let attempts = 0;
      const maxAttempts = 20; // 2초 대기 (100ms * 20)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        const currentState = localStorage.getItem('token');
        if (currentState && currentState === result.accessToken) {
          break;
        }
        attempts++;
      }
      
      // 로그인 후 원래 페이지 또는 기본 페이지로 이동
      const from = (location.state as any)?.from?.pathname || '/search';
      navigate(from, { replace: true });
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const result = await registerMutation(userData).unwrap();
      navigate('/search');
      return true;
    } catch (error) {
      console.error('Registration failed:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await logoutMutation().unwrap();
    } catch (error) {
      console.warn('Logout failed:', error);
    } finally {
      navigate('/login');
    }
  };

  return {
    user: user || profile, // 로그인 시 받은 사용자 정보를 우선 사용
    isAuthenticated,
    isLoggingIn,
    isRegistering,
    login,
    register,
    logout,
    refetchProfile,
  };
};