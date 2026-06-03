// ==============================================
// saga-service 도메인 enum 단일 소스 (UNI-84)
// const 객체 + 파생 타입 → 값 접근·타입 둘 다. Drizzle pgEnum·DTO가 파생.
// ==============================================

export const SagaStatus = {
  STARTED: 'STARTED',
  STEP_EXECUTING: 'STEP_EXECUTING',
  STEP_COMPLETED: 'STEP_COMPLETED',
  COMPLETED: 'COMPLETED',
  STEP_FAILED: 'STEP_FAILED',
  COMPENSATING: 'COMPENSATING',
  COMPENSATION_COMPLETED: 'COMPENSATION_COMPLETED',
  COMPENSATION_FAILED: 'COMPENSATION_FAILED',
  FAILED: 'FAILED',
  REQUIRES_MANUAL: 'REQUIRES_MANUAL',
} as const;
export type SagaStatus = (typeof SagaStatus)[keyof typeof SagaStatus];

export const StepStatus = {
  PENDING: 'PENDING',
  EXECUTING: 'EXECUTING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  COMPENSATED: 'COMPENSATED',
  SKIPPED: 'SKIPPED',
} as const;
export type StepStatus = (typeof StepStatus)[keyof typeof StepStatus];

export const SAGA_STATUS_VALUES = Object.values(SagaStatus) as [SagaStatus, ...SagaStatus[]];
export const STEP_STATUS_VALUES = Object.values(StepStatus) as [StepStatus, ...StepStatus[]];
