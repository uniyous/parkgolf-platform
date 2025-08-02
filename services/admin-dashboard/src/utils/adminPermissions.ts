import type { AdminRole, Permission, AdminScope, PlatformAdminRole, CompanyAdminRole } from '../types';

/**
 * 관리자 역할별 기본 권한 매트릭스
 */
export const ROLE_PERMISSION_MATRIX: Record<AdminRole, Permission[]> = {
  // === 플랫폼 레벨 관리자 ===
  'PLATFORM_OWNER': [
    'PLATFORM_ALL',
    'PLATFORM_COMPANY_MANAGE',
    'PLATFORM_USER_MANAGE',
    'PLATFORM_SYSTEM_CONFIG',
    'PLATFORM_ANALYTICS',
    'PLATFORM_SUPPORT',
    'MANAGE_COMPANIES', // 회사 관리 권한 추가
    'MANAGE_COURSES', // 코스 관리 권한 추가
    'MANAGE_TIMESLOTS', // 타임슬롯 관리 권한 추가
    'MANAGE_BOOKINGS', // 예약 관리 권한 추가
    'MANAGE_USERS', // 사용자 관리 권한 추가
    'MANAGE_ADMINS', // 관리자 관리 권한 추가
    'VIEW_DASHBOARD', // 대시보드 권한 추가
    'VIEW_ANALYTICS', // 분석 권한 추가
    'COMPANY_ALL',
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW'
  ],
  
  'PLATFORM_ADMIN': [
    'PLATFORM_COMPANY_MANAGE',
    'PLATFORM_USER_MANAGE',
    'PLATFORM_ANALYTICS',
    'PLATFORM_SUPPORT',
    'MANAGE_COMPANIES', // 회사 관리 권한 추가
    'MANAGE_COURSES', // 코스 관리 권한 추가
    'MANAGE_TIMESLOTS', // 타임슬롯 관리 권한 추가
    'MANAGE_BOOKINGS', // 예약 관리 권한 추가
    'MANAGE_USERS', // 사용자 관리 권한 추가
    'MANAGE_ADMINS', // 관리자 관리 권한 추가
    'VIEW_DASHBOARD', // 대시보드 권한 추가
    'VIEW_ANALYTICS', // 분석 권한 추가
    'COMPANY_ALL',
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS'
  ],
  
  'PLATFORM_SUPPORT': [
    'PLATFORM_SUPPORT',
    'COMPANY_USER_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'CUSTOMER_SUPPORT',
    'BOOKING_RECEPTION'
  ],
  
  'PLATFORM_ANALYST': [
    'PLATFORM_ANALYTICS',
    'COMPANY_ANALYTICS',
    'COURSE_ANALYTICS_VIEW',
    'READ_ONLY'
  ],

  // === 회사 레벨 관리자 ===
  'COMPANY_OWNER': [
    'COMPANY_ALL',
    'MANAGE_ADMINS', // 회사 소속 관리자 관리
    'MANAGE_TIMESLOTS', // 타임슬롯 관리
    'MANAGE_COURSES', // 코스 관리
    'MANAGE_BOOKINGS', // 예약 관리
    'MANAGE_USERS', // 사용자 관리
    'VIEW_ANALYTICS', // 분석 조회
    'COMPANY_ADMIN_MANAGE',
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW'
  ],
  
  'COMPANY_MANAGER': [
    'MANAGE_ADMINS', // 회사 소속 관리자 관리 (하위 직급만)
    'MANAGE_TIMESLOTS', // 타임슬롯 관리
    'MANAGE_COURSES', // 코스 관리
    'MANAGE_BOOKINGS', // 예약 관리
    'MANAGE_USERS', // 사용자 관리
    'VIEW_ANALYTICS', // 분석 조회
    'COMPANY_COURSE_MANAGE',
    'COMPANY_BOOKING_MANAGE',
    'COMPANY_USER_MANAGE',
    'COMPANY_ANALYTICS',
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW'
  ],
  
  'COURSE_MANAGER': [
    'COURSE_TIMESLOT_MANAGE',
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'BOOKING_RECEPTION',
    'CUSTOMER_SUPPORT'
  ],
  
  'STAFF': [
    'COURSE_BOOKING_MANAGE',
    'COURSE_CUSTOMER_VIEW',
    'BOOKING_RECEPTION',
    'CUSTOMER_SUPPORT'
  ],
  
  'READONLY_STAFF': [
    'COURSE_CUSTOMER_VIEW',
    'COURSE_ANALYTICS_VIEW',
    'READ_ONLY'
  ]
};

/**
 * 역할별 관리 범위 정의
 */
export const ROLE_SCOPE_MATRIX: Record<AdminRole, AdminScope> = {
  'PLATFORM_OWNER': 'PLATFORM',
  'PLATFORM_ADMIN': 'PLATFORM',
  'PLATFORM_SUPPORT': 'PLATFORM',
  'PLATFORM_ANALYST': 'PLATFORM',
  'COMPANY_OWNER': 'COMPANY',
  'COMPANY_MANAGER': 'COMPANY',
  'COURSE_MANAGER': 'COURSE',
  'STAFF': 'COURSE',
  'READONLY_STAFF': 'COURSE'
};

/**
 * 관리자 역할별 한글 라벨
 */
export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  'PLATFORM_OWNER': '플랫폼 최고 관리자',
  'PLATFORM_ADMIN': '플랫폼 운영 관리자',
  'PLATFORM_SUPPORT': '플랫폼 지원팀',
  'PLATFORM_ANALYST': '플랫폼 분석가',
  'COMPANY_OWNER': '회사 대표',
  'COMPANY_MANAGER': '회사 운영 관리자',
  'COURSE_MANAGER': '코스 관리자',
  'STAFF': '일반 직원',
  'READONLY_STAFF': '조회 전용 직원'
};

/**
 * 권한별 한글 라벨
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'PLATFORM_ALL': '플랫폼 전체 권한',
  'PLATFORM_COMPANY_MANAGE': '회사 관리',
  'PLATFORM_USER_MANAGE': '전체 사용자 관리',
  'PLATFORM_SYSTEM_CONFIG': '시스템 설정',
  'PLATFORM_ANALYTICS': '전체 분석',
  'PLATFORM_SUPPORT': '고객 지원',
  'COMPANY_ALL': '회사 전체 권한',
  'COMPANY_ADMIN_MANAGE': '회사 관리자 관리',
  'COMPANY_COURSE_MANAGE': '회사 코스 관리',
  'COMPANY_BOOKING_MANAGE': '회사 예약 관리',
  'COMPANY_USER_MANAGE': '회사 고객 관리',
  'COMPANY_ANALYTICS': '회사 분석',
  'COURSE_TIMESLOT_MANAGE': '타임슬롯 관리',
  'COURSE_BOOKING_MANAGE': '예약 관리',
  'COURSE_CUSTOMER_VIEW': '고객 조회',
  'COURSE_ANALYTICS_VIEW': '코스 분석 조회',
  'READ_ONLY': '조회 전용',
  'BOOKING_RECEPTION': '예약 접수',
  'CUSTOMER_SUPPORT': '고객 응대'
};

/**
 * 역할이 플랫폼 레벨인지 확인
 */
export const isPlatformAdmin = (role: AdminRole): role is PlatformAdminRole => {
  return ['PLATFORM_OWNER', 'PLATFORM_ADMIN', 'PLATFORM_SUPPORT', 'PLATFORM_ANALYST'].includes(role as PlatformAdminRole);
};

/**
 * 역할이 회사 레벨인지 확인
 */
export const isCompanyAdmin = (role: AdminRole): role is CompanyAdminRole => {
  return ['COMPANY_OWNER', 'COMPANY_MANAGER', 'COURSE_MANAGER', 'STAFF', 'READONLY_STAFF'].includes(role as CompanyAdminRole);
};

/**
 * 관리자가 특정 권한을 가지고 있는지 확인
 */
export const hasPermission = (adminPermissions: Permission[], requiredPermission: Permission): boolean => {
  console.log(`🔍 hasPermission check - required: ${requiredPermission}`);
  console.log(`🔍 hasPermission - adminPermissions:`, adminPermissions);
  
  // PLATFORM_ALL이나 COMPANY_ALL 권한이 있으면 해당 범위의 모든 권한을 가짐
  if (adminPermissions.includes('PLATFORM_ALL')) {
    console.log(`✅ hasPermission - PLATFORM_ALL grants all permissions`);
    return true;
  }
  
  if (adminPermissions.includes('COMPANY_ALL') && requiredPermission.startsWith('COMPANY_')) {
    console.log(`✅ hasPermission - COMPANY_ALL grants company permissions`);
    return true;
  }
  
  const hasSpecificPermission = adminPermissions.includes(requiredPermission);
  console.log(`🔍 hasPermission - specific permission check: ${hasSpecificPermission}`);
  return hasSpecificPermission;
};

/**
 * 역할에 따른 기본 권한 목록 반환
 */
export const getDefaultPermissions = (role: AdminRole): Permission[] => {
  return ROLE_PERMISSION_MATRIX[role] || [];
};

/**
 * 역할에 따른 관리 범위 반환
 */
export const getRoleScope = (role: AdminRole): AdminScope => {
  return ROLE_SCOPE_MATRIX[role];
};

/**
 * 관리자가 다른 관리자를 관리할 수 있는지 확인
 */
export const canManageAdmin = (managerRole: AdminRole, targetRole: AdminRole): boolean => {
  // 플랫폼 관리자는 모든 하위 관리자를 관리 가능
  if (isPlatformAdmin(managerRole)) {
    if (managerRole === 'PLATFORM_OWNER') {
      return true; // 플랫폼 오너는 모든 관리자 관리 가능
    }
    if (managerRole === 'PLATFORM_ADMIN') {
      return targetRole !== 'PLATFORM_OWNER'; // 플랫폼 오너 제외하고 관리 가능
    }
    return false; // 지원팀, 분석가는 관리자 관리 불가
  }
  
  // 회사 관리자는 같은 회사의 하위 관리자만 관리 가능
  if (isCompanyAdmin(managerRole)) {
    if (managerRole === 'COMPANY_OWNER') {
      return isCompanyAdmin(targetRole) && targetRole !== 'COMPANY_OWNER';
    }
    if (managerRole === 'COMPANY_MANAGER') {
      return ['COURSE_MANAGER', 'STAFF', 'READONLY_STAFF'].includes(targetRole);
    }
    return false; // 코스 매니저, 직원은 관리자 관리 불가
  }
  
  return false;
};

/**
 * 관리자 역할의 계층 구조 정의 (숫자가 높을수록 상위)
 */
export const ADMIN_HIERARCHY: Record<AdminRole, number> = {
  'PLATFORM_OWNER': 100,
  'PLATFORM_ADMIN': 90,
  'PLATFORM_SUPPORT': 80,
  'PLATFORM_ANALYST': 75,
  'COMPANY_OWNER': 70,
  'COMPANY_MANAGER': 60,
  'COURSE_MANAGER': 50,
  'STAFF': 40,
  'READONLY_STAFF': 30
};

/**
 * 역할별 배지 색상
 */
export const ADMIN_ROLE_COLORS: Record<AdminRole, string> = {
  'PLATFORM_OWNER': 'bg-red-100 text-red-800',
  'PLATFORM_ADMIN': 'bg-red-100 text-red-700',
  'PLATFORM_SUPPORT': 'bg-orange-100 text-orange-800',
  'PLATFORM_ANALYST': 'bg-yellow-100 text-yellow-800',
  'COMPANY_OWNER': 'bg-blue-100 text-blue-800',
  'COMPANY_MANAGER': 'bg-blue-100 text-blue-700',
  'COURSE_MANAGER': 'bg-green-100 text-green-800',
  'STAFF': 'bg-gray-100 text-gray-800',
  'READONLY_STAFF': 'bg-gray-100 text-gray-600'
};