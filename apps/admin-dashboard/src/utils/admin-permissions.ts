import type { AdminRole, AdminScope, Permission, PlatformRole, CompanyRole } from '@/types';

// ============================================
// 역할/권한 구조 (v4 - CompanyType 기반)
// 플랫폼 역할: 3개, 회사 역할: 4개 = 총 7개
// ============================================

// Role Labels (Korean)
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  // 플랫폼 역할 (본사, 협회용)
  PLATFORM_ADMIN: '플랫폼 관리자',
  PLATFORM_SUPPORT: '플랫폼 고객지원',
  PLATFORM_VIEWER: '플랫폼 조회',
  // 회사 역할 (가맹점용)
  COMPANY_ADMIN: '회사 관리자',
  COMPANY_MANAGER: '회사 매니저',
  COMPANY_STAFF: '회사 직원',
  COMPANY_VIEWER: '회사 조회',
};

// Role Colors (Tailwind CSS classes)
export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  // 플랫폼 역할 (보라색 계열)
  PLATFORM_ADMIN: 'bg-purple-100 text-purple-800',
  PLATFORM_SUPPORT: 'bg-indigo-100 text-indigo-800',
  PLATFORM_VIEWER: 'bg-violet-100 text-violet-800',
  // 회사 역할 (초록/노랑 계열)
  COMPANY_ADMIN: 'bg-green-100 text-green-800',
  COMPANY_MANAGER: 'bg-teal-100 text-teal-800',
  COMPANY_STAFF: 'bg-yellow-100 text-yellow-800',
  COMPANY_VIEWER: 'bg-gray-100 text-gray-600',
};

// Admin Permission Labels (10개)
export const ADMIN_PERMISSION_LABELS: Record<string, string> = {
  ALL: '전체 권한',
  COMPANIES: '회사 관리',
  COURSES: '코스 관리',
  TIMESLOTS: '타임슬롯 관리',
  BOOKINGS: '예약 관리',
  USERS: '사용자 관리',
  ADMINS: '관리자 관리',
  ANALYTICS: '분석/리포트',
  SUPPORT: '고객 지원',
  VIEW: '조회',
};

// User Permission Labels (8개)
export const USER_PERMISSION_LABELS: Record<string, string> = {
  PROFILE: '프로필 관리',
  COURSE_VIEW: '코스 조회',
  BOOKING_VIEW: '예약 조회',
  BOOKING_MANAGE: '예약 관리',
  PAYMENT: '결제/환불',
  PREMIUM_BOOKING: '프리미엄 예약',
  PRIORITY_BOOKING: '우선 예약',
  ADVANCED_SEARCH: '고급 검색',
};

// All Permission Labels
export const PERMISSION_LABELS: Record<string, string> = {
  ...ADMIN_PERMISSION_LABELS,
  ...USER_PERMISSION_LABELS,
};

// Admin hierarchy (higher number = higher authority)
export const ADMIN_HIERARCHY: Record<AdminRole, number> = {
  // 플랫폼 역할
  PLATFORM_ADMIN: 100,
  PLATFORM_SUPPORT: 80,
  PLATFORM_VIEWER: 20,
  // 회사 역할
  COMPANY_ADMIN: 90,
  COMPANY_MANAGER: 60,
  COMPANY_STAFF: 40,
  COMPANY_VIEWER: 20,
};

// Role default permissions (역할별 기본 권한)
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  // 플랫폼 역할
  PLATFORM_ADMIN: ['ALL'],
  PLATFORM_SUPPORT: ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW'],
  PLATFORM_VIEWER: ['VIEW'],
  // 회사 역할
  COMPANY_ADMIN: ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW'],
  COMPANY_MANAGER: ['COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ANALYTICS', 'VIEW'],
  COMPANY_STAFF: ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW'],
  COMPANY_VIEWER: ['VIEW'],
};

// User role permissions (사용자 역할)
export const USER_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  PREMIUM: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT', 'PREMIUM_BOOKING', 'PRIORITY_BOOKING', 'ADVANCED_SEARCH'],
  USER: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT'],
  GUEST: ['COURSE_VIEW'],
};

// 플랫폼 역할 목록
export const PLATFORM_ROLES: PlatformRole[] = ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER'];

// 회사 역할 목록
export const COMPANY_ROLES: CompanyRole[] = ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER'];

// Get role scope
export const getRoleScope = (role: AdminRole): AdminScope => {
  if (PLATFORM_ROLES.includes(role as PlatformRole)) return 'PLATFORM';
  return 'COMPANY';
};

// Check if role is platform-level
export const isPlatformRole = (role: AdminRole): boolean => {
  return PLATFORM_ROLES.includes(role as PlatformRole);
};

// Check if role is company-level
export const isCompanyRole = (role: AdminRole): boolean => {
  return COMPANY_ROLES.includes(role as CompanyRole);
};

// Check if role has admin-level authority (can manage other admins)
export const hasAdminAuthority = (role: AdminRole): boolean => {
  return role === 'PLATFORM_ADMIN' || role === 'COMPANY_ADMIN';
};

// Legacy compatibility functions
export const isPlatformAdmin = isPlatformRole;
export const isSystemAdmin = (role: AdminRole): boolean => role === 'PLATFORM_ADMIN';
export const isCompanyAdmin = (role: AdminRole): boolean => role === 'COMPANY_ADMIN';
export const isOperationAdmin = (role: AdminRole): boolean => {
  return role === 'COMPANY_MANAGER' || role === 'COMPANY_STAFF';
};
export const isCourseAdmin = (role: AdminRole): boolean => {
  return role === 'COMPANY_STAFF' || role === 'COMPANY_VIEWER';
};

// Check if user has a specific permission
export const hasPermission = (permissions: Permission[], requiredPermission: Permission): boolean => {
  if (!permissions || permissions.length === 0) return false;
  // ALL 권한은 모든 권한을 포함
  if (permissions.includes('ALL')) return true;
  return permissions.includes(requiredPermission);
};

// Check if an admin can manage another admin based on hierarchy
export const canManageAdmin = (managerRole: AdminRole, targetRole: AdminRole): boolean => {
  const managerLevel = ADMIN_HIERARCHY[managerRole] || 0;
  const targetLevel = ADMIN_HIERARCHY[targetRole] || 0;

  // PLATFORM 역할은 COMPANY 역할을 관리할 수 있음
  if (isPlatformRole(managerRole) && isCompanyRole(targetRole)) {
    return managerLevel >= 80; // PLATFORM_ADMIN, PLATFORM_SUPPORT
  }

  // 같은 범위 내에서는 레벨이 높아야 관리 가능
  if (isPlatformRole(managerRole) === isPlatformRole(targetRole)) {
    return managerLevel > targetLevel;
  }

  // COMPANY 역할은 PLATFORM 역할을 관리할 수 없음
  return false;
};

// Get default permissions for a role
export const getDefaultPermissions = (role: AdminRole): Permission[] => {
  const permissions = ROLE_PERMISSIONS[role];
  if (!permissions) return ['VIEW'];

  // ALL 권한이 있으면 모든 관리자 권한으로 확장
  if (permissions.includes('ALL')) {
    return ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'SUPPORT', 'VIEW'];
  }

  return permissions;
};

// 회사 유형에 따라 부여 가능한 역할 반환
export const getAllowedRolesForCompanyType = (companyType: string): AdminRole[] => {
  switch (companyType) {
    case 'PLATFORM':
      return ['PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_VIEWER'];
    case 'ASSOCIATION':
      return ['PLATFORM_SUPPORT', 'PLATFORM_VIEWER'];
    case 'FRANCHISE':
      return ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'COMPANY_VIEWER'];
    default:
      return ['COMPANY_VIEWER'];
  }
};
