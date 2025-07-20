import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGNB } from './EnhancedGNB';
import { useAuth } from '../../../redux/hooks/useAuth';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const currentUser = {
    username: user?.name || user?.username || '',
    email: user?.email || '',
    role: user?.role || '',
    company: '' // Redux user에는 company 정보가 없을 수 있음
  };

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