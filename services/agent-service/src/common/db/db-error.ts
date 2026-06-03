import { ConflictException, BadRequestException, HttpException } from '@nestjs/common';

/**
 * Drizzle/postgres-js 드라이버 에러 → HTTP 매핑 (UNI-81 공통 패턴).
 * PG SQLSTATE 기반 에러 분류.
 * - P2025(not found) 등가는 없음 → 서비스에서 `.returning()` 길이 체크 후 명시적 NotFoundException.
 */

/** postgres-js 드라이버 에러의 SQLSTATE 코드 추출 */
function pgCode(e: unknown): string | undefined {
  return typeof e === 'object' && e !== null && 'code' in e
    ? String((e as { code: unknown }).code)
    : undefined;
}

/** 23505 unique_violation */
export function isUniqueViolation(e: unknown): boolean {
  return pgCode(e) === '23505';
}

/** 23503 foreign_key_violation */
export function isForeignKeyViolation(e: unknown): boolean {
  return pgCode(e) === '23503';
}

/**
 * DB 드라이버 에러를 HttpException으로 매핑. 해당 없으면 null →
 * 호출 측(UnifiedExceptionFilter)이 기존 처리로 위임.
 */
export function mapDbError(e: unknown): HttpException | null {
  switch (pgCode(e)) {
    case '23505': // unique_violation (was P2002)
      return new ConflictException('중복된 값입니다');
    case '23503': // foreign_key_violation (was P2003)
      return new BadRequestException('참조 무결성 위반입니다');
    case '23502': // not_null_violation
      return new BadRequestException('필수 값이 누락되었습니다');
    default:
      return null;
  }
}
