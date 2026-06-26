/**
 * Admin Role Constants (v3 - CompanyType 기반 역할 관리)
 * 플랫폼 역할 (본사/협회) + 회사 역할 (가맹점)
 */
export const ADMIN_ROLES = [
  // 플랫폼 역할 (본사, 협회)
  'PLATFORM_ADMIN',    // 플랫폼 최고 관리자 - 전체 권한
  'PLATFORM_SUPPORT',  // 플랫폼 고객지원 - 전체 조회/지원
  'PLATFORM_VIEWER',   // 플랫폼 조회 - 전체 데이터 조회
  // 회사 역할 (가맹점)
  'COMPANY_ADMIN',     // 회사 대표/총괄 - 회사 내 전체 권한
  'COMPANY_MANAGER',   // 회사 매니저 - 운영 관리
  'COMPANY_STAFF',     // 회사 직원 - 현장 업무
  'COMPANY_VIEWER',    // 회사 조회 - 회사 데이터 조회
  // 레거시 호환성 (기존 코드)
  'ADMIN',
  'SUPPORT',
  'MANAGER',
  'STAFF',
  'VIEWER',
] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

/**
 * 주어진 역할이 관리자 역할인지 확인
 */
export function isAdminRole(role: string): boolean {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  return ADMIN_ROLES.some((adminRole) => adminRole.toUpperCase() === normalizedRole);
}

/**
 * 역할 배열 중 관리자 역할이 포함되어 있는지 확인
 */
export function hasAdminRole(roles: string[] | undefined): boolean {
  if (!roles || !Array.isArray(roles)) return false;
  return roles.some((role) => isAdminRole(role));
}
