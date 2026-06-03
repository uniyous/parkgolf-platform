/** Drizzle/postgres-js 드라이버 에러 헬퍼 (UNI-81 공통 패턴). PG SQLSTATE. */
export function pgCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

export function isUniqueViolation(e: unknown): boolean {
  return pgCode(e) === '23505';
}
