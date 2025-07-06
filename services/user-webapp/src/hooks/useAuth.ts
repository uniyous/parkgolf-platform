import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { useNavigate } from 'react-router-dom';
import { authState, loginLoadingState, loginErrorState } from '../recoil/atoms/authAtom';
import { isAuthenticatedSelector, currentUserSelector, authTokenSelector } from '../recoil/selectors/authSelectors';
import { authApi, LoginRequest } from '../api/auth';
import { useCallback, useEffect } from 'react';

export const useAuth = () => {
  const navigate = useNavigate();
  const [auth, setAuth] = useRecoilState(authState);
  const setLoginLoading = useSetRecoilState(loginLoadingState);
  const setLoginError = useSetRecoilState(loginErrorState);
  
  const isAuthenticated = useRecoilValue(isAuthenticatedSelector);
  const currentUser = useRecoilValue(currentUserSelector);
  const token = useRecoilValue(authTokenSelector);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken && !auth.isAuthenticated) {
      // Validate token and fetch user profile
      validateAndFetchUser();
    }
  }, []);

  const validateAndFetchUser = useCallback(async () => {
    try {
      const profile = await authApi.getProfile();
      setAuth({
        isAuthenticated: true,
        user: profile,
        token: localStorage.getItem('token'),
        loading: false,
        error: null,
      });
    } catch (error) {
      // Token is invalid, clear it
      localStorage.removeItem('token');
      setAuth({
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: null,
      });
    }
  }, [setAuth]);

  const login = useCallback(async (credentials: LoginRequest) => {
    setLoginLoading(true);
    setLoginError(null);

    try {
      const response = await authApi.login(credentials);
      
      // Store tokens in localStorage
      localStorage.setItem('token', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      
      // Update auth state
      setAuth({
        isAuthenticated: true,
        user: response.user,
        token: response.accessToken,
        loading: false,
        error: null,
      });

      setLoginLoading(false);
      
      // Navigate to dashboard or home
      navigate('/dashboard');
      
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed. Please check your credentials.';
      
      setLoginError(errorMessage);
      setLoginLoading(false);
      
      return { 
        success: false, 
        error: errorMessage 
      };
    }
  }, [navigate, setAuth, setLoginLoading, setLoginError]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch (error) {
      // Ignore logout errors
    }

    // Clear tokens from localStorage
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Clear auth state
    setAuth({
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,
    });

    // Navigate to login
    navigate('/login');
  }, [navigate, setAuth]);

  const checkAuth = useCallback(() => {
    return isAuthenticated;
  }, [isAuthenticated]);

  return {
    // State
    isAuthenticated,
    currentUser,
    token,
    loading: auth.loading,
    error: auth.error,
    
    // Actions
    login,
    logout,
    checkAuth,
    validateAndFetchUser,
  };
};