import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../redux/hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

export const LoginContainer: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await login(email, password);
    if (result.success) {
      // 로그인 성공 후 대시보드로 이동
      navigate('/dashboard');
    }
  };

  return (
    <LoginForm
      email={email}
      password={password}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
    />
  );
};