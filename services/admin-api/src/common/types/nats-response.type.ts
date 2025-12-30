/**
 * NATS Response Types
 * 백엔드 서비스에서 반환하는 응답 타입 정의
 */

/** 성공 응답 타입 */
export interface NatsSuccessResponse<T> {
  success: true;
  data: T;
}

/** 페이지네이션이 포함된 성공 응답 */
export interface NatsPaginatedResponse<T> {
  success: true;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** 목록 응답 (data 안에 페이지네이션 포함) */
export interface NatsListResponse<T> {
  success: true;
  data: {
    admins?: T[];
    users?: T[];
    bookings?: T[];
    clubs?: T[];
    courses?: T[];
    games?: T[];
    timeSlots?: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/** 에러 응답 타입 */
export interface NatsErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** NATS 응답 타입 유니온 */
export type NatsResponse<T> = NatsSuccessResponse<T> | NatsErrorResponse;

/** 타입 가드: 성공 응답인지 확인 */
export function isSuccessResponse<T>(response: NatsResponse<T>): response is NatsSuccessResponse<T> {
  return response.success === true;
}

/** 타입 가드: 에러 응답인지 확인 */
export function isErrorResponse<T>(response: NatsResponse<T>): response is NatsErrorResponse {
  return response.success === false;
}
