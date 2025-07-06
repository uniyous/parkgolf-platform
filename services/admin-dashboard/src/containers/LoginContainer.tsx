import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../redux/hooks/useAuth';
import { LoginForm } from '../components/LoginForm';

export const LoginContainer: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const result = await login(username, password);
    if (result.success) {
      navigate('/course-management');
    }
  };

  return (
    <LoginForm
      username={username}
      password={password}
      onUsernameChange={setUsername}
      onPasswordChange={setPassword}
      onSubmit={handleSubmit}
      isLoading={isLoading}
      error={error}
    />
  );
};