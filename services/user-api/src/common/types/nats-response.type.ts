/**
 * Common API Response Types
 * 백엔드 서비스에서 반환하는 응답 타입 정의
 */

// ============================================
// Common API Response Types
// ============================================

/**
 * 기본 API 응답 인터페이스
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * 페이지네이션 메타 정보
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * 페이지네이션이 포함된 API 응답 인터페이스
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]>, PaginationMeta {}

/**
 * 삭제 응답 인터페이스
 */
export interface DeleteResponse extends ApiResponse<{ deleted: true }> {}

/**
 * Response 헬퍼 클래스
 * NATS 컨트롤러에서 일관된 응답 형식을 생성하기 위한 정적 메서드 제공
 */
export class NatsResponse {
  /**
   * 단일 데이터 응답 생성
   */
  static success<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  /**
   * 페이지네이션 응답 생성
   */
  static paginated<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> {
    return {
      success: true,
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 삭제 성공 응답 생성
   */
  static deleted(): DeleteResponse {
    return { success: true, data: { deleted: true } };
  }
}
