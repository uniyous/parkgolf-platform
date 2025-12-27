import React from 'react';
import { useAuthStore, useCurrentAdmin } from '@/stores';
import type { Permission } from '@/types';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideIfNoAccess?: boolean;
}

/**
 * Permission Guard Component (v3)
 *
 * 권한 기반으로 UI 요소의 접근을 제어합니다.
 *
 * @param permission - 필요한 권한
 * @param children - 권한이 있을 때 렌더링할 컴포넌트
 * @param fallback - 권한이 없을 때 렌더링할 컴포넌트 (optional)
 * @param hideIfNoAccess - 권한이 없을 때 완전히 숨김 (default: false)
 */
export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  children,
  fallback = null,
  hideIfNoAccess = false
}) => {
  const hasAccess = useAuthStore((state) => state.hasPermission(permission));

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfNoAccess) {
    return null;
  }

  return <>{fallback}</>;
};

// v3 권한별 단축 컴포넌트들
interface QuickGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideIfNoAccess?: boolean;
}

export const CanManageUsers: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="USERS" {...props} />
);

export const CanManageAdmins: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="ADMINS" {...props} />
);

export const CanManageCourses: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="COURSES" {...props} />
);

export const CanManageBookings: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="BOOKINGS" {...props} />
);

export const CanManageTimeslots: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="TIMESLOTS" {...props} />
);

export const CanViewAnalytics: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="ANALYTICS" {...props} />
);

export const CanManageCompanies: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="COMPANIES" {...props} />
);

export const CanSupport: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="SUPPORT" {...props} />
);

export const CanView: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="VIEW" {...props} />
);

// 복합 권한 가드
export const CanManageAnyContent: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasManageUsers = hasPermission('USERS');
  const hasManageAdmins = hasPermission('ADMINS');
  const hasManageCourses = hasPermission('COURSES');
  const hasManageBookings = hasPermission('BOOKINGS');

  const hasAccess = hasManageUsers || hasManageAdmins || hasManageCourses || hasManageBookings;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfNoAccess) {
    return null;
  }

  return <>{fallback}</>;
};

// 시스템 관리자 전용 (scope: SYSTEM)
export const SystemAdminOnly: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const currentAdmin = useCurrentAdmin();

  const isSystemAdmin = currentAdmin?.scope === 'SYSTEM';

  if (isSystemAdmin) {
    return <>{children}</>;
  }

  if (hideIfNoAccess) {
    return null;
  }

  return <>{fallback}</>;
};

// 운영 관리자 이상 (scope: SYSTEM or OPERATION)
export const OperationAdminOrAbove: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const currentAdmin = useCurrentAdmin();

  const hasAccess = currentAdmin?.scope === 'SYSTEM' || currentAdmin?.scope === 'OPERATION';

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfNoAccess) {
    return null;
  }

  return <>{fallback}</>;
};

// 관리자 관리 권한 (ADMINS 권한 + 시스템/운영 레벨)
export const CanManageCompanyAdmins: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const currentAdmin = useCurrentAdmin();
  const hasManageAdmins = useAuthStore((state) => state.hasPermission('ADMINS'));

  // ADMINS 권한이 있고, 시스템 또는 운영 레벨의 관리자
  const hasAccess = hasManageAdmins &&
                   (currentAdmin?.scope === 'SYSTEM' || currentAdmin?.scope === 'OPERATION');

  if (hasAccess) {
    return <>{children}</>;
  }

  if (hideIfNoAccess) {
    return null;
  }

  return <>{fallback}</>;
};

// 하위 호환성을 위한 레거시 별칭 (deprecated)
export const PlatformAdminOnly = SystemAdminOnly;
export const CompanyAdminOrAbove = OperationAdminOrAbove;
