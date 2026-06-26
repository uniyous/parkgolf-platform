/**
 * NATS Timeout Constants
 * 모든 NATS 통신에서 사용하는 타임아웃 상수
 *
 * Cloud Run cold start를 고려하여 설정됨
 */
export const NATS_TIMEOUTS = {
  /** Quick operations (single item fetch, validation) - 5초 */
  QUICK: 5000,
  /** Default operations - 30초 (Cloud Run cold start 대응) */
  DEFAULT: 30000,
  /** List queries with pagination - 30초 */
  LIST_QUERY: 30000,
  /** Analytics and statistics - 30초 */
  ANALYTICS: 30000,
  /** Bulk operations (time slot generation, batch processing) - 120초 */
  BULK_OPERATION: 120000,
} as const;

export type NatsTimeoutKey = keyof typeof NATS_TIMEOUTS;
