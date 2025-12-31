/**
 * NATS Response Types
 * 백엔드 서비스에서 반환하는 응답 타입 정의
 */

/** 성공 응답 타입 */
export interface NatsSuccessResponse<T> {
  success: true;
  data: T;
}
