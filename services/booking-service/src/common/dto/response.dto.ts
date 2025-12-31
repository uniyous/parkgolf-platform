/**
 * Common Response DTOs
 * NATS 마이크로서비스 응답을 위한 공통 DTO
 */

/**
 * 페이지네이션 응답 DTO
 */
export class PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;

  /**
   * 페이지네이션 응답 생성
   */
  static of<T>(data: T[], total: number, page: number, limit: number): PaginatedResponse<T> {
    const response = new PaginatedResponse<T>();
    response.data = data;
    response.total = total;
    response.page = page;
    response.limit = limit;
    response.totalPages = Math.ceil(total / limit);
    return response;
  }
}

/**
 * 단일 데이터 응답 DTO
 */
export class DataResponse<T> {
  data: T;

  /**
   * 단일 데이터 응답 생성
   */
  static of<T>(data: T): DataResponse<T> {
    const response = new DataResponse<T>();
    response.data = data;
    return response;
  }
}
