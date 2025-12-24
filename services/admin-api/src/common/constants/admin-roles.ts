/**
 * Admin Role Constants (v2 - 단순화된 구조)
 * 모든 관리자 역할 정의 - 중앙 집중화
 */
export const ADMIN_ROLES = [
  // 신규 역할 (v2)
  'ADMIN',      // 시스템 관리자 - 전체 권한
  'SUPPORT',    // 고객지원 - 예약/사용자/분석/지원
  'MANAGER',    // 운영 관리자 - 코스/예약/사용자/관리자/분석
  'STAFF',      // 현장 직원 - 타임슬롯/예약/지원
  'VIEWER',     // 조회 전용 - 조회만
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
