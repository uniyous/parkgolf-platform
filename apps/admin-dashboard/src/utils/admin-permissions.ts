import type { AdminRole, AdminScope, Permission } from '@/types';

// ============================================
// 역할/권한 단순화된 구조 (v3)
// 관리자 권한: 10개, 사용자 권한: 8개 = 총 18개
// ============================================

// Role Labels (Korean)
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: '시스템 관리자',
  SUPPORT: '고객지원',
  MANAGER: '운영 관리자',
  STAFF: '현장 직원',
  VIEWER: '조회 전용',
};

// Role Colors (Tailwind CSS classes)
export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  ADMIN: 'bg-purple-100 text-purple-800',
  SUPPORT: 'bg-blue-100 text-blue-800',
  MANAGER: 'bg-green-100 text-green-800',
  STAFF: 'bg-yellow-100 text-yellow-800',
  VIEWER: 'bg-gray-100 text-gray-600',
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

// All Permission Labels (18개)
export const PERMISSION_LABELS: Record<string, string> = {
  ...ADMIN_PERMISSION_LABELS,
  ...USER_PERMISSION_LABELS,
};

// Admin hierarchy (higher number = higher authority)
export const ADMIN_HIERARCHY: Record<AdminRole, number> = {
  ADMIN: 100,
  SUPPORT: 80,
  MANAGER: 60,
  STAFF: 40,
  VIEWER: 20,
};

// Role default permissions (관리자 역할)
export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  ADMIN: ['ALL'],
  SUPPORT: ['BOOKINGS', 'USERS', 'ANALYTICS', 'SUPPORT', 'VIEW'],
  MANAGER: ['COMPANIES', 'COURSES', 'TIMESLOTS', 'BOOKINGS', 'USERS', 'ADMINS', 'ANALYTICS', 'VIEW'],
  STAFF: ['TIMESLOTS', 'BOOKINGS', 'SUPPORT', 'VIEW'],
  VIEWER: ['VIEW'],
};

// User role permissions (사용자 역할)
export const USER_ROLE_PERMISSIONS: Record<string, Permission[]> = {
  PREMIUM: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT', 'PREMIUM_BOOKING', 'PRIORITY_BOOKING', 'ADVANCED_SEARCH'],
  USER: ['PROFILE', 'COURSE_VIEW', 'BOOKING_VIEW', 'BOOKING_MANAGE', 'PAYMENT'],
  GUEST: ['COURSE_VIEW'],
};

// Get role scope
export const getRoleScope = (role: AdminRole): AdminScope => {
  if (role === 'ADMIN' || role === 'SUPPORT') return 'SYSTEM';
  if (role === 'MANAGER' || role === 'STAFF') return 'OPERATION';
  return 'VIEW';
};

// Check if role is system-level (ADMIN, SUPPORT)
export const isSystemAdmin = (role: AdminRole): boolean => {
  return role === 'ADMIN' || role === 'SUPPORT';
};

// Check if role is operation-level (MANAGER, STAFF)
export const isOperationAdmin = (role: AdminRole): boolean => {
  return role === 'MANAGER' || role === 'STAFF';
};

// Legacy compatibility functions
export const isPlatformAdmin = isSystemAdmin;
export const isCompanyAdmin = isOperationAdmin;
export const isCourseAdmin = (role: AdminRole): boolean => role === 'STAFF' || role === 'VIEWER';

// Check if user has a specific permission
export const hasPermission = (permissions: Permission[], requiredPermission: Permission): boolean => {
  if (!permissions || permissions.length === 0) return false;

  // ALL grants everything
  if (permissions.includes('ALL')) return true;

  return permissions.includes(requiredPermission);
};

// Check if an admin can manage another admin based on hierarchy
export const canManageAdmin = (managerRole: AdminRole, targetRole: AdminRole): boolean => {
  const managerLevel = ADMIN_HIERARCHY[managerRole] || 0;
  const targetLevel = ADMIN_HIERARCHY[targetRole] || 0;

  // Must be higher in hierarchy to manage
  return managerLevel > targetLevel;
};

// Get default permissions for a role
export const getDefaultPermissions = (role: AdminRole): Permission[] => {
  return ROLE_PERMISSIONS[role] || ['VIEW'];
};
