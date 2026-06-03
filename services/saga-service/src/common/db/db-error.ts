/**
 * Drizzle/postgres-js 드라이버 에러 헬퍼 (UNI-81 공통 패턴). PG SQLSTATE 사용.
 */
export function pgCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

/** 23505 unique_violation (Prisma P2002 대응) */
export function isUniqueViolation(e: unknown): boolean {
  return pgCode(e) === '23505';
}
