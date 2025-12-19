/**
 * Admin Role Constants
 * 모든 관리자 역할 정의 - 중앙 집중화
 */
export const ADMIN_ROLES = [
  // Platform Level
  'PLATFORM_OWNER',
  'PLATFORM_ADMIN',
  'PLATFORM_SUPPORT',
  'PLATFORM_ANALYST',
  // Company Level
  'COMPANY_OWNER',
  'COMPANY_MANAGER',
  // Course Level
  'COURSE_MANAGER',
  'STAFF',
  'READONLY_STAFF',
  // Legacy roles
  'ADMIN',
  'SUPER_ADMIN',
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
