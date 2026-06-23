import React from 'react';
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useIsAuthenticated, useCurrentAdmin, useAuthLoading, useAuthStore } from '@/stores';
import { AdminLayout } from '@/components/layout';
import { useSupportStore } from '@/stores/support.store';

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

  const primaryScope = currentAdmin?.primaryScope;
  const isSupportMode = useSupportStore((s) => s.isSupportMode);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 플랫폼 관리자 + 가맹점 미선택 → 가맹점 선택 페이지로 강제 리다이렉트
  if (primaryScope === 'PLATFORM' && !isSupportMode && location.pathname !== '/select-company') {
    return <Navigate to="/select-company" replace />;
  }

  // /select-company는 AdminLayout 없이 전체화면 렌더링
  if (location.pathname === '/select-company') {
    return children ? children : <Outlet />;
  }

  const primaryCompany = currentAdmin?.primaryCompany?.company || currentAdmin?.company;
  const currentUser = {
    username: currentAdmin?.name || currentAdmin?.username || (isLoading ? '로딩중...' : '개발 관리자'),
    email: currentAdmin?.email || (isLoading ? '...' : 'admin@parkgolf.com'),
    role: currentAdmin?.primaryRole || currentAdmin?.role || 'PLATFORM_ADMIN',
    company: primaryCompany?.name,
    companyType: primaryCompany?.companyType,
  };

  const handleLogout = async () => {
    logoutAction();
    navigate('/login');
  };

  return (
    <AdminLayout currentUser={currentUser} onLogout={handleLogout}>
      {children ? children : <Outlet />}
    </AdminLayout>
  );
};
