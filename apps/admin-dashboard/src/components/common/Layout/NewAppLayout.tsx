import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGNB } from './EnhancedGNB';
import { useCurrentAdmin, useAuthLoading, useAuthStore } from '@/stores';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const currentAdmin = useCurrentAdmin();
  const isLoading = useAuthLoading();
  const logoutAction = useAuthStore((state) => state.logout);

  // 로딩 중이거나 currentAdmin이 없을 때 기본값 사용
  const currentUser = {
    username: currentAdmin?.name || currentAdmin?.username || (isLoading ? '로딩중...' : '개발 관리자'),
    email: currentAdmin?.email || (isLoading ? '...' : 'admin@parkgolf.com'),
    role: currentAdmin?.role || 'PLATFORM_OWNER',
    company: currentAdmin?.company?.name || '플랫폼'
  };

  const handleLogout = async () => {
    logoutAction();
    navigate('/login');
  };

  return (
    <EnhancedGNB 
      currentUser={currentUser} 
      onLogout={handleLogout}
    >
      {children}
    </EnhancedGNB>
  );
};