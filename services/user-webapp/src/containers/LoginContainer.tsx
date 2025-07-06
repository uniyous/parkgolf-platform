import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../hooks/useAuth';
import { loginLoadingState, loginErrorState } from '../recoil/atoms/authAtom';

export const LoginContainer: React.FC = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const loading = useRecoilValue(loginLoadingState);
  const error = useRecoilValue(loginErrorState);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (username: string, password: string) => {
    await login({ username, password });
  };

  return (
    <LoginForm
      onSubmit={handleLogin}
      loading={loading}
      error={error}
    />
  );
};