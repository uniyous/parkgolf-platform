import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useIsAuthenticated, useCurrentAdmin, useAuthLoading, useAuthStore } from '@/stores';
import { MainLayout } from '@/components/layout';

interface PrivateRouteProps {
  children?: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const currentAdmin = useCurrentAdmin();
  const isLoading = useAuthLoading();
  const logoutAction = useAuthStore((state) => state.logout);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const currentUser = {
    username: currentAdmin?.name || currentAdmin?.username || (isLoading ? '로딩중...' : '개발 관리자'),
    email: currentAdmin?.email || (isLoading ? '...' : 'admin@parkgolf.com'),
    role: currentAdmin?.primaryRole || currentAdmin?.role || 'PLATFORM_ADMIN',
    company: currentAdmin?.primaryCompany?.company?.name || currentAdmin?.company?.name || '플랫폼'
  };

  const handleLogout = async () => {
    logoutAction();
    navigate('/login');
  };

  return (
    <MainLayout currentUser={currentUser} onLogout={handleLogout}>
      {children ? children : <Outlet />}
    </MainLayout>
  );
};
