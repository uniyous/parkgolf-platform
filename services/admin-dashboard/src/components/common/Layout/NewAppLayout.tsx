import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EnhancedGNB } from './EnhancedGNB';
import { useAdminAuth } from '../../../contexts/AdminAuthContext';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const { currentAdmin, logout, getDisplayInfo } = useAdminAuth();
  
  const displayInfo = getDisplayInfo();
  const currentUser = {
    username: displayInfo.name,
    email: currentAdmin?.email || '',
    role: displayInfo.role,
    company: displayInfo.company
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