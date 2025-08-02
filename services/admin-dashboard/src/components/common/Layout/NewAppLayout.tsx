import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { EnhancedGNB } from './EnhancedGNB';
import { selectCurrentAdmin, selectIsLoading, logout } from '../../../redux/slices/authSlice';

interface NewAppLayoutProps {
  children: React.ReactNode;
}

export const NewAppLayout: React.FC<NewAppLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentAdmin = useSelector(selectCurrentAdmin);
  const isLoading = useSelector(selectIsLoading);
  
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
    dispatch(logout());
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