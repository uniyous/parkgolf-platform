/**
 * @uniyous/saga-engine — 런타임 제네릭 saga 엔진 (UNI-127 ②)
 *
 * marketplace-saga-service에서 이관. NATS·DB·pg-boss 직접 의존 0 — 포트(store·executor·
 * scheduler·registry)에만 의존. 제품 특화 로직(payment-timeout 등)은 SagaDefinition.hooks.
 * 제어 흐름은 기존 SagaEngineService와 동일(기능변경 0).
 */
import { NatsResponse, type SagaMeta } from '@uniyous/nats-common';
import { SagaStatus, StepStatus, type SagaDefinition, type StepExecutorPort } from './index';
import type {
  SagaStorePort,
  JobSchedulerPort,
  SagaRegistryPort,
  SagaLogger,
} from './ports';

const SAGA_TIMEOUT_RECOVERY_QUEUE = 'saga-timeout-recovery';
const SAGA_TIMEOUT_DELAY_SECONDS = 15 * 60; // 15분

export interface SagaEngineDeps {
  store: SagaStorePort;
  executor: StepExecutorPort;
  scheduler: JobSchedulerPort;
  registry: SagaRegistryPort;
  logger: SagaLogger;
}

export class SagaEngine {
  private readonly store: SagaStorePort;
  private readonly executor: StepExecutorPort;
  private readonly scheduler: JobSchedulerPort;
  private readonly registry: SagaRegistryPort;
  private readonly logger: SagaLogger;

  constructor(deps: SagaEngineDeps) {
    this.store = deps.store;
    this.executor = deps.executor;
    this.scheduler = deps.scheduler;
    this.registry = deps.registry;
    this.logger = deps.logger;
  }

  /**
   * Saga 시작
   */
  async startSaga(
    sagaType: string,
    payload: Record<string, unknown>,
    triggeredBy?: string,
    triggeredById?: number,
  ) {
    const definition = this.registry.get(sagaType);
    if (!definition) {
      this.logger.error(`Unknown saga type: ${sagaType}`);
      return NatsResponse.withSaga({}, {
        executionId: 0,
        status: 'FAILED',
        failReason: `Unknown saga type: ${sagaType}`,
      });
    }

    const correlationId = this.buildCorrelationId(sagaType, payload);
    const startTime = Date.now();

    this.logger.log(`[SagaEngine] ========== SAGA ${sagaType} STARTING ==========`);
    this.logger.log(`[SagaEngine] correlationId=${correlationId}, triggeredBy=${triggeredBy}`);

    // 중복 Saga 체크
    const existing = await this.store.findByCorrelationId(correlationId);
    if (existing && existing.status !== SagaStatus.FAILED) {
      this.logger.warn(`[SagaEngine] Duplicate saga: ${correlationId}, status=${existing.status}`);
      const existingPayload = (existing.payload as Record<string, unknown>) ?? {};
      return NatsResponse.withSaga(existingPayload, {
        executionId: existing.id,
        status: existing.status as SagaMeta['status'],
        duplicate: true,
      });
    }

    // SagaExecution + 모든 SagaStep 레코드 생성 (트랜잭션 — FAILED 이전 실행 있으면 삭제 후 재생성)
    const replaceFailedId =
      existing && existing.status === SagaStatus.FAILED ? existing.id : undefined;
    if (replaceFailedId) {
      this.logger.log(`[SagaEngine] Removing FAILED saga ${replaceFailedId} for retry: ${correlationId}`);
    }
    const sagaExecution = await this.store.createExecutionWithSteps(
      {
        sagaType,
        correlationId,
        status: SagaStatus.STARTED,
        currentStep: 0,
        totalSteps: definition.steps.length,
        payload,
        triggeredBy,
        triggeredById,
      },
      definition.steps.map((step, i) => ({
        stepIndex: i,
        stepName: step.name,
        actionPattern: step.action,
        compensatePattern: step.compensate,
      })),
      replaceFailedId,
    );

    this.logger.log(`[SagaEngine] SagaExecution created: id=${sagaExecution.id}`);

    // pg-boss timeout recovery task 등록 (saga가 hang되어도 자동 보상 처리)
    let timeoutJobId: string | null = null;
    try {
      timeoutJobId = await this.scheduler.schedule(
        SAGA_TIMEOUT_RECOVERY_QUEUE,
        { sagaExecutionId: sagaExecution.id },
        {
          startAfter: SAGA_TIMEOUT_DELAY_SECONDS,
          singletonKey: `saga-timeout-${sagaExecution.id}`,
          retryLimit: 3,
        },
      );
      if (timeoutJobId) {
        await this.store.updateExecution(sagaExecution.id, { timeoutJobId });
      }
    } catch (err) {
      this.logger.warn(
        `[SagaEngine] Failed to register timeout task: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      // saga 진행은 계속 (타임아웃 보상 누락은 안전망 worker가 처리)
    }

    // Step들을 순차 실행
    const result = await this.executeSteps(sagaExecution.id, definition, payload);
    const elapsed = Date.now() - startTime;

    this.logger.log(`[SagaEngine] Saga ${sagaType} ${result.sagaStatus} in ${elapsed}ms: executionId=${sagaExecution.id}`);
    this.logger.log(`[SagaEngine] ========== SAGA ${sagaType} ${result.sagaStatus} ==========`);

    // 정상 종료 시 timeout task 취소
    if (timeoutJobId) {
      try {
        await this.scheduler.cancel(SAGA_TIMEOUT_RECOVERY_QUEUE, timeoutJobId);
      } catch (err) {
        this.logger.debug(`[SagaEngine] timeout task cancel skipped: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    const { sagaStatus, failReason, ...dataPayload } = result as {
      sagaStatus: string;
      failReason?: string;
      [key: string]: unknown;
    };

    return NatsResponse.withSaga(dataPayload, {
      executionId: sagaExecution.id,
      status: sagaStatus as SagaMeta['status'],
      failReason,
    });
  }

  /**
   * Saga timeout 복구 (pg-boss worker에서 호출)
   */
  async recoverTimedOutSaga(sagaExecutionId: number) {
    const saga = await this.store.findWithSteps(sagaExecutionId);

    if (!saga) {
      return { skipped: true, reason: 'not_found' };
    }

    // 이미 종료된 saga는 처리 불필요
    const terminalStatuses: SagaStatus[] = [
      SagaStatus.COMPLETED,
      SagaStatus.FAILED,
      SagaStatus.REQUIRES_MANUAL,
      SagaStatus.COMPENSATION_COMPLETED,
      SagaStatus.COMPENSATION_FAILED,
    ];
    if (terminalStatuses.includes(saga.status)) {
      return { skipped: true, currentStatus: saga.status };
    }

    this.logger.warn(
      `[SagaEngine] Recovering timed-out saga ${sagaExecutionId} (status=${saga.status}, sagaType=${saga.sagaType})`,
    );

    const definition = this.registry.get(saga.sagaType);
    if (!definition) {
      await this.store.updateExecution(sagaExecutionId, {
        status: SagaStatus.REQUIRES_MANUAL,
        failReason: `Timed out + saga definition not found: ${saga.sagaType}`,
        failedAt: new Date(),
      });
      return { recovered: false, reason: 'definition_missing' };
    }

    // 마지막으로 완료된 step 다음부터 보상 시작
    const completedStepIndex = saga.steps
      .filter((s) => s.status === StepStatus.COMPLETED)
      .reduce((max, s) => Math.max(max, s.stepIndex), -1);

    const compensated = await this.runCompensation(
      sagaExecutionId,
      definition,
      completedStepIndex + 1,
      saga.payload as Record<string, unknown>,
    );

    const finalStatus = compensated ? SagaStatus.FAILED : SagaStatus.REQUIRES_MANUAL;

    await this.store.updateExecution(sagaExecutionId, {
      status: finalStatus,
      failReason: 'Saga timeout — auto recovery via pg-boss',
      failedAt: new Date(),
    });

    this.logger.warn(`[SagaEngine] Saga ${sagaExecutionId} timeout recovery complete: ${finalStatus}`);

    return { recovered: true, finalStatus, compensated };
  }

  /**
   * Step들을 순차 실행
   */
  private async executeSteps(
    sagaExecutionId: number,
    definition: SagaDefinition,
    initialPayload: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    let currentPayload = { ...initialPayload };
    // 제품 훅용 per-execution 상태 bag (구 timeoutScheduled once-guard 대체)
    const hookState: Record<string, unknown> = {};

    for (let i = 0; i < definition.steps.length; i++) {
      const stepDef = definition.steps[i];

      // 조건부 실행 체크
      if (stepDef.condition && !stepDef.condition(currentPayload)) {
        this.logger.log(`[SagaEngine] Step ${i}/${definition.steps.length} ${stepDef.name} SKIPPED (condition not met)`);
        await this.store.updateStep(sagaExecutionId, i, { status: StepStatus.SKIPPED, completedAt: new Date() });
        continue;
      }

      // SagaExecution 상태 업데이트
      await this.store.updateExecution(sagaExecutionId, { status: SagaStatus.STEP_EXECUTING, currentStep: i });

      // Step용 요청 데이터 빌드
      const requestPayload = stepDef.buildRequest(currentPayload);

      // Step 시작 기록
      await this.store.updateStep(sagaExecutionId, i, {
        status: StepStatus.EXECUTING,
        startedAt: new Date(),
        requestPayload,
      });

      this.logger.log(`[SagaEngine] Step ${i + 1}/${definition.steps.length} ${stepDef.name} executing`);

      // Step 실행
      const result = await this.executor.executeStep(stepDef, requestPayload);

      if (result.success) {
        // Step 성공
        await this.store.updateStep(sagaExecutionId, i, {
          status: StepStatus.COMPLETED,
          completedAt: new Date(),
          responsePayload: result.data || {},
        });

        // 응답을 payload에 병합
        if (stepDef.mergeResponse && result.data) {
          currentPayload = stepDef.mergeResponse(currentPayload, result.data);
        }

        await this.store.updateExecution(sagaExecutionId, { status: SagaStatus.STEP_COMPLETED, payload: currentPayload });

        // 제품 라이프사이클 훅 (구 CREATE_BOOKING payment-timeout 스케줄 → marketplace 정의 훅으로)
        if (definition.hooks?.onStepCompleted) {
          await definition.hooks.onStepCompleted({
            definitionName: definition.name,
            payload: currentPayload,
            scheduler: this.scheduler,
            logger: this.logger,
            state: hookState,
          });
        }
      } else {
        // Step 실패
        await this.store.updateStep(sagaExecutionId, i, {
          status: StepStatus.FAILED,
          completedAt: new Date(),
          errorMessage: result.error,
        });

        if (stepDef.optional) {
          this.logger.warn(`[SagaEngine] Optional step ${stepDef.name} failed, skipping: ${result.error}`);
          await this.store.updateStep(sagaExecutionId, i, { status: StepStatus.SKIPPED, completedAt: new Date() });
          continue;
        }

        // 필수 Step 실패 → 보상 시작
        this.logger.error(`[SagaEngine] Step ${stepDef.name} FAILED: ${result.error}`);
        await this.store.updateExecution(sagaExecutionId, { status: SagaStatus.STEP_FAILED, failReason: result.error });

        const compensationSuccess = await this.runCompensation(sagaExecutionId, definition, i, currentPayload);

        const finalStatus = compensationSuccess ? SagaStatus.FAILED : SagaStatus.REQUIRES_MANUAL;

        await this.store.updateExecution(sagaExecutionId, { status: finalStatus, failReason: result.error, failedAt: new Date() });

        return { sagaStatus: finalStatus, ...currentPayload, failReason: result.error };
      }
    }

    // 모든 Step 성공
    await this.store.updateExecution(sagaExecutionId, {
      status: SagaStatus.COMPLETED,
      completedAt: new Date(),
      payload: currentPayload,
    });

    return { sagaStatus: 'COMPLETED', ...currentPayload };
  }

  /**
   * 보상 트랜잭션 실행 (완료된 Step을 역순으로)
   */
  async runCompensation(
    sagaExecutionId: number,
    definition: SagaDefinition,
    failedStepIndex: number,
    payload: Record<string, unknown>,
  ): Promise<boolean> {
    this.logger.log(`[SagaEngine] Starting compensation from step ${failedStepIndex - 1} down to 0`);

    await this.store.updateExecution(sagaExecutionId, { status: SagaStatus.COMPENSATING });

    let allCompensated = true;

    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const stepDef = definition.steps[i];

      if (!stepDef.compensate) {
        this.logger.log(`[SagaEngine] Step ${stepDef.name} has no compensation, skipping`);
        continue;
      }

      // 해당 Step이 실제로 완료되었는지 확인
      const sagaStep = await this.store.getStep(sagaExecutionId, i);

      if (!sagaStep || sagaStep.status !== StepStatus.COMPLETED) {
        this.logger.log(`[SagaEngine] Step ${stepDef.name} was not completed, skipping compensation`);
        continue;
      }

      this.logger.log(`[SagaEngine] Compensating step ${stepDef.name} → ${stepDef.compensate}`);

      const result = await this.executor.executeCompensation(
        stepDef.compensate,
        stepDef.targetService,
        stepDef.buildRequest(payload),
        stepDef.timeout,
      );

      if (result.success) {
        await this.store.updateStep(sagaExecutionId, i, { status: StepStatus.COMPENSATED });
        this.logger.log(`[SagaEngine] Compensation for ${stepDef.name} SUCCESS`);
      } else {
        this.logger.error(`[SagaEngine] Compensation for ${stepDef.name} FAILED: ${result.error}`);
        allCompensated = false;
      }
    }

    const compensationStatus = allCompensated
      ? SagaStatus.COMPENSATION_COMPLETED
      : SagaStatus.COMPENSATION_FAILED;

    await this.store.updateExecution(sagaExecutionId, { status: compensationStatus });

    return allCompensated;
  }

  /**
   * 실패한 Saga 재시도
   */
  async retrySaga(sagaExecutionId: number) {
    const execution = await this.store.findById(sagaExecutionId);

    if (!execution) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    if (execution.status !== SagaStatus.FAILED && execution.status !== SagaStatus.REQUIRES_MANUAL) {
      return NatsResponse.success({ error: `Cannot retry saga in status: ${execution.status}` });
    }

    const definition = this.registry.get(execution.sagaType);
    if (!definition) {
      return NatsResponse.success({ error: `Unknown saga type: ${execution.sagaType}` });
    }

    this.logger.log(`[SagaEngine] Retrying saga ${sagaExecutionId} (${execution.sagaType})`);

    // 상태 초기화 (execution + 모든 step)
    await this.store.resetForRetry(sagaExecutionId);

    const payload = execution.payload as Record<string, unknown>;
    const result = await this.executeSteps(sagaExecutionId, definition, payload);

    return NatsResponse.success({ sagaExecutionId, ...result });
  }

  /**
   * Saga 수동 완료 처리
   */
  async resolveSaga(sagaExecutionId: number, adminNote?: string) {
    const execution = await this.store.findById(sagaExecutionId);

    if (!execution) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    if (execution.status !== SagaStatus.REQUIRES_MANUAL) {
      return NatsResponse.success({ error: `Cannot resolve saga in status: ${execution.status}` });
    }

    await this.store.updateExecution(sagaExecutionId, {
      status: SagaStatus.COMPLETED,
      completedAt: new Date(),
      payload: {
        ...(execution.payload as Record<string, unknown>),
        resolvedManually: true,
        adminNote,
      },
    });

    this.logger.log(`[SagaEngine] Saga ${sagaExecutionId} manually resolved`);
    return NatsResponse.success({ sagaExecutionId, sagaStatus: 'COMPLETED', resolvedManually: true });
  }

  /**
   * Saga 목록 조회
   */
  async listSagas(filters: { sagaType?: string; status?: string; page?: number; limit?: number }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const { rows, total } = await this.store.list({ ...filters, page, limit });
    return NatsResponse.paginated(rows, total, page, limit);
  }

  /**
   * Saga 상세 조회
   */
  async getSaga(sagaExecutionId: number) {
    const saga = await this.store.findWithSteps(sagaExecutionId, { orderSteps: true });

    if (!saga) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    return NatsResponse.success(saga);
  }

  /**
   * Saga 통계
   */
  async getStats(dateRange?: { startDate: string; endDate: string }) {
    const { total, completed, failed, requiresManual, active } = await this.store.getStats(dateRange);

    return NatsResponse.success({
      total,
      completed,
      failed,
      requiresManual,
      active,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  private buildCorrelationId(sagaType: string, payload: Record<string, unknown>): string {
    if (payload.idempotencyKey) return `${sagaType}:${payload.idempotencyKey}`;
    if (payload.bookingId) return `${sagaType}:booking:${payload.bookingId}`;
    return `${sagaType}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
