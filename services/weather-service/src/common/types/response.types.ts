/**
 * API 응답 타입
 */
export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
}

/**
 * NATS 응답 헬퍼
 */
export class NatsResponse {
  static success<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

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

  static error(code: string, message: string): ErrorResponse {
    return {
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    };
  }
}
