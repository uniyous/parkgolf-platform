import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGNB } from './EnhancedGNB';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { currentAdmin, logout, isLoading } = useAdminAuth();
  
  // 디버깅 로그 추가
  console.log('NewAppLayout - currentAdmin:', currentAdmin);
  console.log('NewAppLayout - isLoading:', isLoading);
  
  // 로딩 중이거나 currentAdmin이 없을 때 기본값 사용
  const currentUser = {
    username: currentAdmin?.name || currentAdmin?.username || (isLoading ? '로딩중...' : '개발 관리자'),
    email: currentAdmin?.email || (isLoading ? '...' : 'admin@parkgolf.com'),
    role: currentAdmin?.role || 'PLATFORM_OWNER',
    company: currentAdmin?.company?.name || '플랫폼'
  };
  
  console.log('NewAppLayout - currentUser:', currentUser);

  const handleLogout = async () => {
    logout();
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