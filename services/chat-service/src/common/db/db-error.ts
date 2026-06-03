/**
 * Drizzle/postgres-js 드라이버 에러 헬퍼 (UNI-81 공통 패턴).
 * Prisma 에러코드 대신 PG SQLSTATE 사용.
 * - P2025(not found) 등가 없음 → 서비스에서 `.returning()` 길이 체크 후 명시적 처리.
 */

/** postgres-js 드라이버 에러의 SQLSTATE 코드 추출 */
export function pgCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

/** 23505 unique_violation (Prisma P2002 대응) */
export function isUniqueViolation(e: unknown): boolean {
  return pgCode(e) === '23505';
}

/** 23503 foreign_key_violation (Prisma P2003 대응) */
export function isForeignKeyViolation(e: unknown): boolean {
  return pgCode(e) === '23503';
}
