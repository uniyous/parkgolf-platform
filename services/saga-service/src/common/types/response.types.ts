/** NATS 응답 타입 */

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]>, Pagination {}

export interface CountResponse {
  success: true;
  count: number;
}

export const isWrapped = (v: unknown): v is ApiResponse<unknown> =>
  typeof v === 'object' && v !== null && 'success' in v;

export const NatsResponse = {
  success: <T>(data: T): ApiResponse<T> => ({ success: true, data }),

  paginated: <T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginatedResponse<T> => ({
    success: true,
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }),

  count: (count: number): CountResponse => ({ success: true, count }),

  deleted: () => ({ success: true, data: { deleted: true } }) as const,
} as const;
