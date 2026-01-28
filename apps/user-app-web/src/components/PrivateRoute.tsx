import React, { useState, useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useIsAuthenticated } from '@/stores/authStore';
import { usePasswordExpiryQuery } from '@/hooks/queries/auth';
import { useNotificationSocketInitializer } from '@/hooks/useNotificationSocket';
import {
  PasswordChangeReminderModal,
  hasRecentlySkipped,
} from '@/components/ui';

interface PrivateRouteProps {
  children?: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = useIsAuthenticated();
  const [showPasswordReminder, setShowPasswordReminder] = useState(false);
  const [hasCheckedExpiry, setHasCheckedExpiry] = useState(false);

  const { data: passwordExpiry, isSuccess } = usePasswordExpiryQuery();

  // 실시간 알림 소켓 초기화 (인증된 사용자만)
  useNotificationSocketInitializer();

  // 비밀번호 만료 체크 (한 세션에 한 번만)
  useEffect(() => {
    if (isSuccess && passwordExpiry && !hasCheckedExpiry) {
      setHasCheckedExpiry(true);

      // 비밀번호 변경이 필요하고, 최근 7일 내 스킵하지 않았으면 모달 표시
      if (passwordExpiry.needsChange && !hasRecentlySkipped()) {
        setShowPasswordReminder(true);
      }
    }
  }, [isSuccess, passwordExpiry, hasCheckedExpiry]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <>
      {children ? <>{children}</> : <Outlet />}
      <PasswordChangeReminderModal
        open={showPasswordReminder}
        onOpenChange={setShowPasswordReminder}
        daysSinceChange={passwordExpiry?.daysSinceChange ?? null}
      />
    </>
  );
};
