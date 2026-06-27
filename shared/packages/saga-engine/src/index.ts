/**
 * @uniyous/saga-engine — 제네릭 saga 엔진 계약 (배포 안 됨 · file: 의존)
 *
 * 엔진은 제품 무관 → marketplace/manager saga 서비스가 공유. 여기엔 NATS·DB 직접
 * 의존이 없는 **순수 계약 표면**만 둔다(상태 enum · step/saga 정의 · StepExecutor 포트).
 * 런타임 오케스트레이터(SagaEngineService)의 포트화·이관은 UNI-127 ②에서 수행.
 */

// ── 상태 enum (const 객체 + 파생 타입 → 값 접근·타입 둘 다. Drizzle pgEnum·DTO가 파생) ──
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

// ── Saga 정의 인터페이스 ──
// targetService 는 NATS 클라이언트 선택용 토큰 — 제품마다 집합이 달라 제네릭으로 둔다
// (marketplace: BOOKING_SERVICE 등 / manager: 별도 집합). 기본 string.
export interface StepDefinition<TTarget extends string = string> {
  /** Step 이름 (예: RESERVE_SLOT) */
  name: string;
  /** NATS Request 패턴 (예: slot.reserve) */
  action: string;
  /** 보상 NATS 패턴 (null이면 보상 불필요) */
  compensate: string | null;
  /** Step 타임아웃 (ms) */
  timeout: number;
  /** 실패해도 Saga를 계속 진행할지 여부 (알림 등) */
  optional?: boolean;
  /** 대상 서비스 토큰 (NATS 클라이언트 선택용) */
  targetService: TTarget;
  /** 조건부 실행 함수 — false 반환 시 SKIPPED */
  condition?: (payload: Record<string, unknown>) => boolean;
  /** payload에서 Step용 요청 데이터를 추출하는 함수 */
  buildRequest: (payload: Record<string, unknown>) => Record<string, unknown>;
  /** Step 성공 시 payload에 결과를 병합하는 함수 */
  mergeResponse?: (
    payload: Record<string, unknown>,
    response: Record<string, unknown>,
  ) => Record<string, unknown>;
}

export interface SagaDefinition<TTarget extends string = string> {
  /** Saga 유형 이름 (예: CREATE_BOOKING) */
  name: string;
  /** Step 목록 (실행 순서대로) */
  steps: StepDefinition<TTarget>[];
}

// ── StepExecutor 포트 ──
// 엔진은 이 인터페이스에만 의존하고, NATS 구현은 각 saga 서비스가 주입한다
// (InventoryProvider·PgProvider와 동일한 포트/어댑터). UNI-127 ②에서 엔진이 이 포트를 소비.
export interface StepResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  elapsedMs: number;
}

export interface StepExecutorPort {
  /** Step 실행 (NATS Request-Reply, optional이면 fire-and-forget) */
  executeStep(
    step: StepDefinition,
    requestPayload: Record<string, unknown>,
  ): Promise<StepResult>;
  /** 보상 Step 실행 */
  executeCompensation(
    compensatePattern: string,
    targetService: string,
    payload: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<StepResult>;
}
