/**
 * NATS Timeout Constants
 * Saga Step 실행 시 사용하는 타임아웃 상수
 */
export const NATS_TIMEOUTS = {
  /** Quick operations (policy check, status update) - 5초 */
  QUICK: 5000,
  /** Default operations (slot reserve/release) - 30초 */
  DEFAULT: 30000,
  /** Payment operations (Toss API 호출 포함) - 30초 */
  PAYMENT: 30000,
  /** Notification (fire-and-forget) - 5초 */
  NOTIFICATION: 5000,
  /** Partner external API operations - 60초 */
  PARTNER: 60000,
} as const;

/** Saga 타임아웃 설정 */
export const SAGA_CONFIG = {
  /** Saga 전체 타임아웃 (ms) - 5분 */
  SAGA_TIMEOUT_MS: 300000,
  /** 완료된 Saga 보존 기간 (일) */
  RETENTION_DAYS: 30,
} as const;
