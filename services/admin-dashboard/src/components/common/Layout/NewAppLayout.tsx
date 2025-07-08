import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGNB } from './EnhancedGNB';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  
  // 임시로 하드코딩된 사용자 정보 (실제로는 context나 store에서 가져옴)
  const currentUser = { 
    username: '관리자', 
    email: 'admin@parkgolf.com' 
  };

  const handleLogout = async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
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