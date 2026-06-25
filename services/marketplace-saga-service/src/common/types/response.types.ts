/** NATS 응답 타입 */

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Saga 트랜잭션 메타데이터 */
export interface SagaMeta {
  executionId: number;
  status: 'COMPLETED' | 'FAILED' | 'REQUIRES_MANUAL' | 'STARTED' | 'STEP_EXECUTING' | 'STEP_COMPLETED' | 'STEP_FAILED' | 'COMPENSATING' | 'COMPENSATED';
  failReason?: string;
  duplicate?: boolean;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  /** saga 트랜잭션을 경유한 응답에만 존재 */
  saga?: SagaMeta;
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

  /** saga 메타를 포함한 응답 */
  withSaga: <T>(data: T, saga: SagaMeta): ApiResponse<T> => ({ success: true, data, saga }),

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
