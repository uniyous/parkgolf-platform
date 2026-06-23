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

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
  saga?: SagaMeta;
}

export class NatsResponse {
  static success<T>(data: T): ApiResponse<T> {
    return { success: true, data };
  }

  static withSaga<T>(data: T, saga: SagaMeta): ApiResponse<T> {
    return { success: true, data, saga };
  }

  static error(code: string, message: string): ErrorResponse {
    return {
      success: false,
      error: { code, message },
      timestamp: new Date().toISOString(),
    };
  }
}
