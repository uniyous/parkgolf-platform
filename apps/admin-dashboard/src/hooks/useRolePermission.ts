import { useMemo } from 'react';
import { useAuth } from '../redux/hooks/useAuth';
import type { Permission, AdminRole, Admin } from '../types';

export interface UseRolePermissionReturn {
  currentAdmin: Admin | null;
  currentRole: AdminRole | null;
  permissions: Permission[];
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isRole: (role: AdminRole) => boolean;
  isAnyRole: (roles: AdminRole[]) => boolean;
  
  // 새로운 역할 체크 함수들
  isPlatformOwner: () => boolean;
  isPlatformAdmin: () => boolean;
  isPlatformSupport: () => boolean;
  isPlatformAnalyst: () => boolean;
  isCompanyOwner: () => boolean;
  isCompanyManager: () => boolean;
  isCourseManager: () => boolean;
  isStaff: () => boolean;
  isReadonlyStaff: () => boolean;
  
  // 새로운 권한 체크 함수들 (실제 Permission 사용)
  canViewDashboard: () => boolean;
  canManageCompanies: () => boolean;
  canManageCourses: () => boolean;
  canManageTimeslots: () => boolean;
  canManageBookings: () => boolean;
  canManageUsers: () => boolean;
  canManageAdmins: () => boolean;
  canViewAnalytics: () => boolean;
  canManageSystem: () => boolean;
  
  // 레벨별 권한 체크
  isPlatformLevel: () => boolean;
  isCompanyLevel: () => boolean;
  isCourseLevel: () => boolean;
}

// 새로운 AdminRole 시스템의 권한 매트릭스 (실제 Permission 사용)
const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  'PLATFORM_OWNER': [
    'PLATFORM_ALL',
    'PLATFORM_COMPANY_MANAGE',
    'PLATFORM_USER_MANAGE',
    'PLATFORM_SYSTEM_CONFIG',
    'PLATFORM_ANALYTICS',
    'PLATFORM_SUPPORT',
    'COMPANY_ALL',
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD',
    'MANAGE_COMPANIES',
    'MANAGE_COURSES',
    'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS',
    'MANAGE_USERS',
    'MANAGE_ADMINS',
    'VIEW_ANALYTICS',
  ],
  
  'PLATFORM_ADMIN': [
    'PLATFORM_COMPANY_MANAGE',
    'PLATFORM_USER_MANAGE',
    'PLATFORM_ANALYTICS',
    'PLATFORM_SUPPORT',
    'COMPANY_ALL',
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'VIEW_DASHBOARD',
    'MANAGE_COMPANIES',
    'MANAGE_COURSES',
    'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS',
    'MANAGE_USERS',
    'MANAGE_ADMINS',
    'VIEW_ANALYTICS',
  ],
  
  'PLATFORM_SUPPORT': [
    'PLATFORM_SUPPORT',
    'COMPANY_USER_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'CUSTOMER_SUPPORT',
    'BOOKING_RECEPTION',
    'VIEW_DASHBOARD',
    'MANAGE_BOOKINGS',
    'MANAGE_USERS',
  ],
  
  'PLATFORM_ANALYST': [
    'PLATFORM_ANALYTICS',
    'COMPANY_ANALYTICS',
    'COURSE_ANALYTICS_VIEW',
    'READ_ONLY',
    'VIEW_DASHBOARD',
    'VIEW_ANALYTICS',
  ],
  
  'COMPANY_OWNER': [
    'COMPANY_ALL',
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD',
    'MANAGE_COURSES',
    'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS',
    'MANAGE_USERS',
    'MANAGE_ADMINS',
    'VIEW_ANALYTICS',
  ],
  
  'COMPANY_MANAGER': [
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'VIEW_DASHBOARD',
    'MANAGE_COURSES',
    'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS',
    'MANAGE_USERS',
    'VIEW_ANALYTICS',
  ],
  
  'COURSE_MANAGER': [
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'BOOKING_RECEPTION',
    'CUSTOMER_SUPPORT',
    'VIEW_DASHBOARD',
    'MANAGE_TIMESLOTS',
    'MANAGE_BOOKINGS',
  ],
  
  'STAFF': [
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'BOOKING_RECEPTION',
    'CUSTOMER_SUPPORT',
    'VIEW_DASHBOARD',
    'MANAGE_BOOKINGS',
  ],
  
  'READONLY_STAFF': [
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'READ_ONLY',
    'VIEW_DASHBOARD',
  ],
};

export function useRolePermission(): UseRolePermissionReturn {
  const { user } = useAuth();
  
  const currentAdmin = user as Admin | null;
  const currentRole = currentAdmin?.role as AdminRole | null;
  
  const permissions = useMemo((): Permission[] => {
    if (!currentAdmin || !currentRole) return [];
    return currentAdmin.permissions || ROLE_PERMISSIONS[currentRole] || [];
  }, [currentAdmin, currentRole]);

  const hasPermission = (permission: Permission): boolean => {
    return permissions.includes(permission);
  };

  const hasAnyPermission = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.some(permission => permissions.includes(permission));
  };

  const hasAllPermissions = (requiredPermissions: Permission[]): boolean => {
    return requiredPermissions.every(permission => permissions.includes(permission));
  };

  const isRole = (role: AdminRole): boolean => {
    return currentRole === role;
  };

  const isAnyRole = (roles: AdminRole[]): boolean => {
    return currentRole ? roles.includes(currentRole) : false;
  };

  // 새로운 역할 체크 함수들
  const isPlatformOwner = (): boolean => isRole('PLATFORM_OWNER');
  const isPlatformAdmin = (): boolean => isRole('PLATFORM_ADMIN');
  const isPlatformSupport = (): boolean => isRole('PLATFORM_SUPPORT');
  const isPlatformAnalyst = (): boolean => isRole('PLATFORM_ANALYST');
  const isCompanyOwner = (): boolean => isRole('COMPANY_OWNER');
  const isCompanyManager = (): boolean => isRole('COMPANY_MANAGER');
  const isCourseManager = (): boolean => isRole('COURSE_MANAGER');
  const isStaff = (): boolean => isRole('STAFF');
  const isReadonlyStaff = (): boolean => isRole('READONLY_STAFF');

  // 새로운 권한 체크 함수들 (실제 Permission 사용)
  const canViewDashboard = (): boolean => hasPermission('VIEW_DASHBOARD');
  const canManageCompanies = (): boolean => hasPermission('MANAGE_COMPANIES');
  const canManageCourses = (): boolean => hasPermission('MANAGE_COURSES');
  const canManageTimeslots = (): boolean => hasPermission('MANAGE_TIMESLOTS');
  const canManageBookings = (): boolean => hasPermission('MANAGE_BOOKINGS');
  const canManageUsers = (): boolean => hasPermission('MANAGE_USERS');
  const canManageAdmins = (): boolean => hasPermission('COMPANY_ADMIN_MANAGE');
  const canViewAnalytics = (): boolean => hasPermission('VIEW_ANALYTICS');
  const canManageSystem = (): boolean => hasPermission('PLATFORM_SYSTEM_CONFIG');

  // 레벨별 권한 체크
  const isPlatformLevel = (): boolean => isAnyRole(['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_ANALYST']);
  const isCompanyLevel = (): boolean => isAnyRole(['COMPANY_OWNER', 'COMPANY_MANAGER']);
  const isCourseLevel = (): boolean => isAnyRole(['COURSE_MANAGER', 'STAFF', 'READONLY_STAFF']);

  return {
    currentAdmin,
    currentRole,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isRole,
    isAnyRole,
    
    // 새로운 역할 체크 함수들
    isPlatformOwner,
    isPlatformAdmin,
    isPlatformSupport,
    isPlatformAnalyst,
    isCompanyOwner,
    isCompanyManager,
    isCourseManager,
    isStaff,
    isReadonlyStaff,
    
    // 새로운 권한 체크 함수들
    canViewDashboard,
    canManageCompanies,
    canManageCourses,
    canManageTimeslots,
    canManageBookings,
    canManageUsers,
    canManageAdmins,
    canViewAnalytics,
    canManageSystem,
    
    // 레벨별 권한 체크
    isPlatformLevel,
    isCompanyLevel,
    isCourseLevel,
  };
}