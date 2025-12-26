import { useMemo } from 'react';
import { useAuth } from './useAuth';
import type { Permission, AdminRole, Admin } from '../types';
import { ROLE_PERMISSIONS, hasPermission as checkPermission } from '../utils/admin-permissions';

export interface UseRolePermissionReturn {
  currentAdmin: Admin | null;
  currentRole: AdminRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRole: (role: AdminRole) => boolean;
  isAnyRole: (roles: AdminRole[]) => boolean;

  // 역할 체크 함수들 (v3 - 단순화)
  isAdmin: () => boolean;
  isSupport: () => boolean;
  isManager: () => boolean;
  isStaff: () => boolean;
  isViewer: () => boolean;

  // 권한 체크 함수들 (v3 - 단순화된 18개 권한)
  canViewDashboard: () => boolean;
  canManageCompanies: () => boolean;
  canManageCourses: () => boolean;
  canManageTimeslots: () => boolean;
  canManageBookings: () => boolean;
  canManageUsers: () => boolean;
  canManageAdmins: () => boolean;
  canViewAnalytics: () => boolean;
  canManageSupport: () => boolean;
  hasFullAccess: () => boolean;

  // 레벨별 권한 체크
  isSystemLevel: () => boolean;
  isOperationLevel: () => boolean;
  isViewLevel: () => boolean;

  // 하위 호환성 (deprecated)
  /** @deprecated Use isAdmin() instead */
  isPlatformOwner: () => boolean;
  /** @deprecated Use isAdmin() instead */
  isPlatformAdmin: () => boolean;
  /** @deprecated Use isSupport() instead */
  isPlatformSupport: () => boolean;
  /** @deprecated Use isViewer() instead */
  isPlatformAnalyst: () => boolean;
  /** @deprecated Use isManager() instead */
  isCompanyOwner: () => boolean;
  /** @deprecated Use isManager() instead */
  isCompanyManager: () => boolean;
  /** @deprecated Use isStaff() instead */
  isCourseManager: () => boolean;
  /** @deprecated Use isViewer() instead */
  isReadonlyStaff: () => boolean;

  // 레벨별 (deprecated)
  /** @deprecated Use isSystemLevel() instead */
  isPlatformLevel: () => boolean;
  /** @deprecated Use isOperationLevel() instead */
  isCompanyLevel: () => boolean;
  /** @deprecated Use isOperationLevel() instead */
  isCourseLevel: () => boolean;
}

export function useRolePermission(): UseRolePermissionReturn {
  const { user } = useAuth();

  const currentAdmin = user as Admin | null;
  const currentRole = currentAdmin?.role as AdminRole | null;

  const permissions = useMemo((): Permission[] => {
    if (!currentAdmin || !currentRole) return [];
    // 서버에서 받은 권한 우선, 없으면 역할 기반 기본 권한
    return currentAdmin.permissions || ROLE_PERMISSIONS[currentRole] || [];
  }, [currentAdmin, currentRole]);

  const hasPermission = (permission: Permission): boolean => {
    return checkPermission(permissions, permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    if (permissions.includes('ALL')) return true;
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    if (permissions.includes('ALL')) return true;
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const isRole = (role: AdminRole): boolean => {
    return currentRole === role;
  };

  const isAnyRole = (roles: AdminRole[]): boolean => {
    return currentRole ? roles.includes(currentRole) : false;
  };

  // 역할 체크 함수들 (v3)
  const isAdmin = (): boolean => isRole('ADMIN');
  const isSupport = (): boolean => isRole('SUPPORT');
  const isManager = (): boolean => isRole('MANAGER');
  const isStaff = (): boolean => isRole('STAFF');
  const isViewer = (): boolean => isRole('VIEWER');

  // 권한 체크 함수들 (v3 - 단순화된 권한)
  const hasFullAccess = (): boolean => hasPermission('ALL');
  const canViewDashboard = (): boolean => hasPermission('VIEW') || hasPermission('ALL');
  const canManageCompanies = (): boolean => hasPermission('COMPANIES') || hasPermission('ALL');
  const canManageCourses = (): boolean => hasPermission('COURSES') || hasPermission('ALL');
  const canManageTimeslots = (): boolean => hasPermission('TIMESLOTS') || hasPermission('ALL');
  const canManageBookings = (): boolean => hasPermission('BOOKINGS') || hasPermission('ALL');
  const canManageUsers = (): boolean => hasPermission('USERS') || hasPermission('ALL');
  const canManageAdmins = (): boolean => hasPermission('ADMINS') || hasPermission('ALL');
  const canViewAnalytics = (): boolean => hasPermission('ANALYTICS') || hasPermission('ALL');
  const canManageSupport = (): boolean => hasPermission('SUPPORT') || hasPermission('ALL');

  // 레벨별 권한 체크
  const isSystemLevel = (): boolean => isAnyRole(['ADMIN', 'SUPPORT']);
  const isOperationLevel = (): boolean => isAnyRole(['MANAGER', 'STAFF']);
  const isViewLevel = (): boolean => isRole('VIEWER');

  // 하위 호환성 함수들 (deprecated)
  const isPlatformOwner = (): boolean => isAdmin();
  const isPlatformAdmin = (): boolean => isAdmin();
  const isPlatformSupport = (): boolean => isSupport();
  const isPlatformAnalyst = (): boolean => isViewer();
  const isCompanyOwner = (): boolean => isManager();
  const isCompanyManager = (): boolean => isManager();
  const isCourseManager = (): boolean => isStaff();
  const isReadonlyStaff = (): boolean => isViewer();

  const isPlatformLevel = (): boolean => isSystemLevel();
  const isCompanyLevel = (): boolean => isOperationLevel();
  const isCourseLevel = (): boolean => isOperationLevel() || isViewLevel();

  return {
    currentAdmin,
    currentRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAnyRole,

    // 역할 체크 (v3)
    isAdmin,
    isSupport,
    isManager,
    isStaff,
    isViewer,

    // 권한 체크 (v3)
    canViewDashboard,
    canManageCompanies,
    canManageCourses,
    canManageTimeslots,
    canManageBookings,
    canManageUsers,
    canManageAdmins,
    canViewAnalytics,
    canManageSupport,
    hasFullAccess,

    // 레벨별
    isSystemLevel,
    isOperationLevel,
    isViewLevel,

    // 하위 호환성 (deprecated)
    isPlatformOwner,
    isPlatformAdmin,
    isPlatformSupport,
    isPlatformAnalyst,
    isCompanyOwner,
    isCompanyManager,
    isCourseManager,
    isReadonlyStaff,
    isPlatformLevel,
    isCompanyLevel,
    isCourseLevel,
  };
}
