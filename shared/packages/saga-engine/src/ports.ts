/**
 * @uniyous/saga-engine — 포트 (UNI-127 ②)
 *
 * 런타임 엔진(engine.ts)이 의존하는 추상 인터페이스. NATS/DB/pgboss 구현은 각 saga
 * 서비스가 어댑터로 주입한다(ports & adapters). 엔진은 여기 정의된 포트에만 의존.
 */
import type { SagaStatus, StepStatus } from './index';
import type { SagaDefinition } from './index';

// ── DB row 타입 (saga_executions / saga_steps 컬럼과 정렬) ──
export interface SagaExecutionRow {
  id: number;
  sagaType: string;
  correlationId: string;
  status: SagaStatus;
  currentStep: number;
  totalSteps: number;
  payload: unknown;
  failReason: string | null;
  timeoutJobId: string | null;
  triggeredBy: string | null;
  triggeredById: number | null;
  startedAt: Date;
  completedAt: Date | null;
  failedAt: Date | null;
}

export interface SagaStepRow {
  id: number;
  sagaExecutionId: number;
  stepIndex: number;
  stepName: string;
  actionPattern: string;
  status: StepStatus;
  retryCount: number;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  isCompensation: boolean;
  compensatePattern: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export interface NewStepSeed {
  stepIndex: number;
  stepName: string;
  actionPattern: string;
  compensatePattern: string | null;
}

export interface CreateExecutionInput {
  sagaType: string;
  correlationId: string;
  status: SagaStatus;
  currentStep: number;
  totalSteps: number;
  payload: Record<string, unknown>;
  triggeredBy?: string;
  triggeredById?: number;
}

export interface ExecutionPatch {
  status?: SagaStatus;
  currentStep?: number;
  payload?: Record<string, unknown>;
  failReason?: string | null;
  failedAt?: Date | null;
  completedAt?: Date | null;
  timeoutJobId?: string | null;
}

export interface StepPatch {
  status?: StepStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  requestPayload?: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  errorMessage?: string | null;
  retryCount?: number;
}

export interface ListFilters {
  sagaType?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface SagaStats {
  total: number;
  completed: number;
  failed: number;
  requiresManual: number;
  active: number;
}

/**
 * Saga 영속 포트 — DB 구현(Drizzle 등)을 추상화. 어댑터가 동일 테이블에 쿼리.
 */
export interface SagaStorePort {
  findByCorrelationId(correlationId: string): Promise<SagaExecutionRow | undefined>;
  findById(executionId: number): Promise<SagaExecutionRow | undefined>;
  findWithSteps(
    executionId: number,
    opts?: { orderSteps?: boolean },
  ): Promise<(SagaExecutionRow & { steps: SagaStepRow[] }) | undefined>;
  getStep(executionId: number, stepIndex: number): Promise<SagaStepRow | undefined>;
  /**
   * 트랜잭션: replaceFailedExecutionId가 주어지면 그 실행(+steps)을 cascade 삭제 후
   * execution + steps 레코드를 원자적으로 생성. 생성된 execution 반환.
   */
  createExecutionWithSteps(
    input: CreateExecutionInput,
    steps: NewStepSeed[],
    replaceFailedExecutionId?: number,
  ): Promise<SagaExecutionRow>;
  updateExecution(executionId: number, patch: ExecutionPatch): Promise<void>;
  updateStep(executionId: number, stepIndex: number, patch: StepPatch): Promise<void>;
  /** 실패한 saga 재시도용 — execution(STARTED·currentStep 0·fail 초기화) + 모든 step(PENDING 초기화) */
  resetForRetry(executionId: number): Promise<void>;
  list(
    filters: ListFilters,
  ): Promise<{ rows: (SagaExecutionRow & { steps: SagaStepRow[] })[]; total: number }>;
  getStats(range?: DateRange): Promise<SagaStats>;
}

/**
 * 지연 잡 스케줄러 포트 — pg-boss 등을 추상화 (saga timeout·payment timeout).
 */
export interface JobSchedulerPort {
  schedule(
    queue: string,
    data: object,
    opts: { startAfter: number; singletonKey: string; retryLimit: number },
  ): Promise<string | null>;
  cancel(queue: string, jobId: string): Promise<void>;
}

/** 로깅 포트 (NestJS Logger 호환 — 서비스가 주입) */
export interface SagaLogger {
  log(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
}

/** Saga 정의 레지스트리 포트 — 서비스가 제품 정의를 등록·제공 */
export interface SagaRegistryPort {
  get(sagaType: string): SagaDefinition | undefined;
}

/**
 * Saga 라이프사이클 훅 — 제품 특화 로직(예: CREATE_BOOKING payment-timeout)을 엔진 밖으로.
 * onStepCompleted는 각 step 성공·payload 병합 직후 호출된다. state는 saga 실행 1회 동안
 * 유지되는 가변 bag(once-guard 등에 사용).
 */
export interface SagaHookContext {
  definitionName: string;
  payload: Record<string, unknown>;
  scheduler: JobSchedulerPort;
  logger: SagaLogger;
  state: Record<string, unknown>;
}
export interface SagaHooks {
  onStepCompleted?(ctx: SagaHookContext): Promise<void> | void;
}
