import React from 'react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import type { Permission } from '../../types';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideIfNoAccess?: boolean;
}

/**
 * Permission Guard Component
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
  const { hasPermission } = useAdminAuth();
  
  const hasAccess = hasPermission(permission);
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};

// 권한별 단축 컴포넌트들
interface QuickGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  hideIfNoAccess?: boolean;
}

export const CanManageUsers: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_USERS" {...props} />
);

export const CanManageAdmins: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_ADMINS" {...props} />
);

export const CanManageCourses: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_COURSES" {...props} />
);

export const CanManageBookings: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_BOOKINGS" {...props} />
);

export const CanManagePayments: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_PAYMENTS" {...props} />
);

export const CanViewReports: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="VIEW_REPORTS" {...props} />
);

export const CanViewAnalytics: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="VIEW_ANALYTICS" {...props} />
);

export const CanManageNotifications: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_NOTIFICATIONS" {...props} />
);

export const CanManageSystem: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_SYSTEM" {...props} />
);

export const CanManageCompanies: React.FC<QuickGuardProps> = (props) => (
  <PermissionGuard permission="MANAGE_COMPANIES" {...props} />
);

// 복합 권한 가드
export const CanManageAnyContent: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const { hasPermission } = useAdminAuth();
  
  const hasAccess = hasPermission('MANAGE_USERS') || 
                   hasPermission('MANAGE_ADMINS') || 
                   hasPermission('MANAGE_COURSES') || 
                   hasPermission('MANAGE_BOOKINGS');
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};

// 플랫폼 관리자 전용
export const PlatformAdminOnly: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const { currentAdmin } = useAdminAuth();
  
  const isPlatformAdmin = currentAdmin?.scope === 'PLATFORM';
  
  if (isPlatformAdmin) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};

// 회사 관리자 이상
export const CompanyAdminOrAbove: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const { currentAdmin } = useAdminAuth();
  
  const hasAccess = currentAdmin?.scope === 'PLATFORM' || currentAdmin?.scope === 'COMPANY';
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};

// 회사 소속 관리자 관리 권한 (김대표, 남운영 등)
export const CanManageCompanyAdmins: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const { currentAdmin, hasPermission } = useAdminAuth();
  
  // MANAGE_ADMINS 권한이 있고, 회사 레벨 이상의 관리자
  const hasAccess = hasPermission('MANAGE_ADMINS') && 
                   (currentAdmin?.scope === 'PLATFORM' || currentAdmin?.scope === 'COMPANY');
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};

// 타임슬롯 관리 권한 (회사 관리자 포함)
export const CanManageTimeslots: React.FC<QuickGuardProps> = ({ children, fallback, hideIfNoAccess }) => {
  const { hasPermission } = useAdminAuth();
  
  const hasAccess = hasPermission('MANAGE_TIMESLOTS');
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  if (hideIfNoAccess) {
    return null;
  }
  
  return <>{fallback}</>;
};