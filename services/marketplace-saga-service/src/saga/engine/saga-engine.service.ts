import { Injectable, Logger } from '@nestjs/common';
import { eq, and, count, asc, desc, gte, lte, inArray, type SQL } from 'drizzle-orm';
import { DrizzleService } from '../../db/drizzle.service';
import { sagaExecutions, sagaSteps } from '../../db/schema';
import { SagaStatus, StepStatus } from '../../contracts/enums';
import { SagaRegistry } from './saga-registry';
import { StepExecutorService } from './step-executor.service';
import { SagaDefinition } from '../definitions/saga-definition.interface';
import { NatsResponse, type SagaMeta } from '../../common/types/response.types';
import { PgBossService } from '../../common/pgboss/pgboss.service';

const SAGA_TIMEOUT_RECOVERY_QUEUE = 'saga-timeout-recovery';
const SAGA_TIMEOUT_DELAY_SECONDS = 15 * 60; // 15분

// CREATE_BOOKING 후 결제 미완료 시 자동 정리용 큐
const PAYMENT_TIMEOUT_QUEUE = 'payment-timeout';
const PAYMENT_TIMEOUT_DELAY_SECONDS = 3 * 60; // 3분 — PaymentSplit.expirationMinutes와 동기화

@Injectable()
export class SagaEngineService {
  private readonly logger = new Logger(SagaEngineService.name);

  constructor(
    private readonly drizzle: DrizzleService,
    private readonly registry: SagaRegistry,
    private readonly stepExecutor: StepExecutorService,
    private readonly pgboss: PgBossService,
  ) {}

  private get db() {
    return this.drizzle.db;
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
    const [existing] = await this.db
      .select()
      .from(sagaExecutions)
      .where(eq(sagaExecutions.correlationId, correlationId))
      .limit(1);
    if (existing && existing.status !== SagaStatus.FAILED) {
      this.logger.warn(`[SagaEngine] Duplicate saga: ${correlationId}, status=${existing.status}`);
      const existingPayload = (existing.payload as Record<string, unknown>) ?? {};
      return NatsResponse.withSaga(existingPayload, {
        executionId: existing.id,
        status: existing.status as SagaMeta['status'],
        duplicate: true,
      });
    }

    // SagaExecution 생성 + 모든 SagaStep 레코드 생성 (트랜잭션)
    const sagaExecution = await this.db.transaction(async (tx) => {
      // FAILED 상태의 이전 실행이 있으면 삭제 후 재생성
      if (existing && existing.status === SagaStatus.FAILED) {
        this.logger.log(`[SagaEngine] Removing FAILED saga ${existing.id} for retry: ${correlationId}`);
        await tx.delete(sagaSteps).where(eq(sagaSteps.sagaExecutionId, existing.id));
        await tx.delete(sagaExecutions).where(eq(sagaExecutions.id, existing.id));
      }

      const [execution] = await tx
        .insert(sagaExecutions)
        .values({
          sagaType,
          correlationId,
          status: SagaStatus.STARTED,
          currentStep: 0,
          totalSteps: definition.steps.length,
          payload,
          triggeredBy,
          triggeredById,
        })
        .returning();

      // 모든 Step 레코드 미리 생성
      if (definition.steps.length > 0) {
        await tx.insert(sagaSteps).values(
          definition.steps.map((step, i) => ({
            sagaExecutionId: execution.id,
            stepIndex: i,
            stepName: step.name,
            actionPattern: step.action,
            status: StepStatus.PENDING,
            compensatePattern: step.compensate,
          })),
        );
      }

      return execution;
    });

    this.logger.log(`[SagaEngine] SagaExecution created: id=${sagaExecution.id}`);

    // pg-boss timeout recovery task 등록 (saga가 hang되어도 자동 보상 처리)
    let timeoutJobId: string | null = null;
    try {
      timeoutJobId = await this.pgboss.send(
        SAGA_TIMEOUT_RECOVERY_QUEUE,
        { sagaExecutionId: sagaExecution.id },
        {
          startAfter: SAGA_TIMEOUT_DELAY_SECONDS,
          singletonKey: `saga-timeout-${sagaExecution.id}`,
          retryLimit: 3,
        },
      );
      if (timeoutJobId) {
        await this.db
          .update(sagaExecutions)
          .set({ timeoutJobId })
          .where(eq(sagaExecutions.id, sagaExecution.id));
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
        await this.pgboss.cancel(SAGA_TIMEOUT_RECOVERY_QUEUE, timeoutJobId);
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
    const saga = await this.db.query.sagaExecutions.findFirst({
      where: eq(sagaExecutions.id, sagaExecutionId),
      with: { steps: true },
    });

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
      await this.db
        .update(sagaExecutions)
        .set({
          status: SagaStatus.REQUIRES_MANUAL,
          failReason: `Timed out + saga definition not found: ${saga.sagaType}`,
          failedAt: new Date(),
        })
        .where(eq(sagaExecutions.id, sagaExecutionId));
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

    await this.db
      .update(sagaExecutions)
      .set({
        status: finalStatus,
        failReason: 'Saga timeout — auto recovery via pg-boss',
        failedAt: new Date(),
      })
      .where(eq(sagaExecutions.id, sagaExecutionId));

    this.logger.warn(`[SagaEngine] Saga ${sagaExecutionId} timeout recovery complete: ${finalStatus}`);

    return { recovered: true, finalStatus, compensated };
  }

  /**
   * 결제 타임아웃 one-off 잡 등록 (UNI-38 #6).
   */
  private async schedulePaymentTimeout(bookingId: number): Promise<void> {
    try {
      await this.pgboss.send(
        PAYMENT_TIMEOUT_QUEUE,
        { bookingId },
        {
          startAfter: PAYMENT_TIMEOUT_DELAY_SECONDS,
          singletonKey: `payment-timeout-${bookingId}`,
          retryLimit: 3,
        },
      );
      this.logger.log(
        `[SagaEngine] payment-timeout scheduled: booking ${bookingId} (+${PAYMENT_TIMEOUT_DELAY_SECONDS}s)`,
      );
    } catch (err) {
      this.logger.warn(
        `[SagaEngine] Failed to schedule payment-timeout for booking ${bookingId}: ${err instanceof Error ? err.message : 'unknown'}`,
      );
    }
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
    let timeoutScheduled = false;

    for (let i = 0; i < definition.steps.length; i++) {
      const stepDef = definition.steps[i];

      // 조건부 실행 체크
      if (stepDef.condition && !stepDef.condition(currentPayload)) {
        this.logger.log(`[SagaEngine] Step ${i}/${definition.steps.length} ${stepDef.name} SKIPPED (condition not met)`);
        await this.updateStepStatus(sagaExecutionId, i, StepStatus.SKIPPED);
        continue;
      }

      // SagaExecution 상태 업데이트
      await this.db
        .update(sagaExecutions)
        .set({ status: SagaStatus.STEP_EXECUTING, currentStep: i })
        .where(eq(sagaExecutions.id, sagaExecutionId));

      // Step용 요청 데이터 빌드
      const requestPayload = stepDef.buildRequest(currentPayload);

      // Step 시작 기록
      await this.db
        .update(sagaSteps)
        .set({ status: StepStatus.EXECUTING, startedAt: new Date(), requestPayload })
        .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, i)));

      this.logger.log(`[SagaEngine] Step ${i + 1}/${definition.steps.length} ${stepDef.name} executing`);

      // Step 실행
      const result = await this.stepExecutor.executeStep(stepDef, requestPayload);

      if (result.success) {
        // Step 성공
        await this.db
          .update(sagaSteps)
          .set({ status: StepStatus.COMPLETED, completedAt: new Date(), responsePayload: result.data || {} })
          .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, i)));

        // 응답을 payload에 병합
        if (stepDef.mergeResponse && result.data) {
          currentPayload = stepDef.mergeResponse(currentPayload, result.data);
        }

        await this.db
          .update(sagaExecutions)
          .set({ status: SagaStatus.STEP_COMPLETED, payload: currentPayload })
          .where(eq(sagaExecutions.id, sagaExecutionId));

        // CREATE_BOOKING: bookingId 확보 즉시 결제 타임아웃 one-off 잡 등록 (UNI-38 #6).
        if (
          !timeoutScheduled &&
          definition.name === 'CREATE_BOOKING' &&
          typeof (currentPayload as { bookingId?: number }).bookingId === 'number'
        ) {
          timeoutScheduled = true;
          await this.schedulePaymentTimeout((currentPayload as { bookingId: number }).bookingId);
        }
      } else {
        // Step 실패
        await this.db
          .update(sagaSteps)
          .set({ status: StepStatus.FAILED, completedAt: new Date(), errorMessage: result.error })
          .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, i)));

        if (stepDef.optional) {
          this.logger.warn(`[SagaEngine] Optional step ${stepDef.name} failed, skipping: ${result.error}`);
          await this.updateStepStatus(sagaExecutionId, i, StepStatus.SKIPPED);
          continue;
        }

        // 필수 Step 실패 → 보상 시작
        this.logger.error(`[SagaEngine] Step ${stepDef.name} FAILED: ${result.error}`);
        await this.db
          .update(sagaExecutions)
          .set({ status: SagaStatus.STEP_FAILED, failReason: result.error })
          .where(eq(sagaExecutions.id, sagaExecutionId));

        const compensationSuccess = await this.runCompensation(sagaExecutionId, definition, i, currentPayload);

        const finalStatus = compensationSuccess ? SagaStatus.FAILED : SagaStatus.REQUIRES_MANUAL;

        await this.db
          .update(sagaExecutions)
          .set({ status: finalStatus, failReason: result.error, failedAt: new Date() })
          .where(eq(sagaExecutions.id, sagaExecutionId));

        return { sagaStatus: finalStatus, ...currentPayload, failReason: result.error };
      }
    }

    // 모든 Step 성공
    await this.db
      .update(sagaExecutions)
      .set({ status: SagaStatus.COMPLETED, completedAt: new Date(), payload: currentPayload })
      .where(eq(sagaExecutions.id, sagaExecutionId));

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

    await this.db
      .update(sagaExecutions)
      .set({ status: SagaStatus.COMPENSATING })
      .where(eq(sagaExecutions.id, sagaExecutionId));

    let allCompensated = true;

    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const stepDef = definition.steps[i];

      if (!stepDef.compensate) {
        this.logger.log(`[SagaEngine] Step ${stepDef.name} has no compensation, skipping`);
        continue;
      }

      // 해당 Step이 실제로 완료되었는지 확인
      const [sagaStep] = await this.db
        .select()
        .from(sagaSteps)
        .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, i)))
        .limit(1);

      if (!sagaStep || sagaStep.status !== StepStatus.COMPLETED) {
        this.logger.log(`[SagaEngine] Step ${stepDef.name} was not completed, skipping compensation`);
        continue;
      }

      this.logger.log(`[SagaEngine] Compensating step ${stepDef.name} → ${stepDef.compensate}`);

      const result = await this.stepExecutor.executeCompensation(
        stepDef.compensate,
        stepDef.targetService,
        stepDef.buildRequest(payload),
        stepDef.timeout,
      );

      if (result.success) {
        await this.db
          .update(sagaSteps)
          .set({ status: StepStatus.COMPENSATED })
          .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, i)));
        this.logger.log(`[SagaEngine] Compensation for ${stepDef.name} SUCCESS`);
      } else {
        this.logger.error(`[SagaEngine] Compensation for ${stepDef.name} FAILED: ${result.error}`);
        allCompensated = false;
      }
    }

    const compensationStatus = allCompensated
      ? SagaStatus.COMPENSATION_COMPLETED
      : SagaStatus.COMPENSATION_FAILED;

    await this.db
      .update(sagaExecutions)
      .set({ status: compensationStatus })
      .where(eq(sagaExecutions.id, sagaExecutionId));

    return allCompensated;
  }

  /**
   * 실패한 Saga 재시도
   */
  async retrySaga(sagaExecutionId: number) {
    const [execution] = await this.db
      .select()
      .from(sagaExecutions)
      .where(eq(sagaExecutions.id, sagaExecutionId))
      .limit(1);

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

    // 상태 초기화
    await this.db
      .update(sagaExecutions)
      .set({ status: SagaStatus.STARTED, currentStep: 0, failReason: null, failedAt: null })
      .where(eq(sagaExecutions.id, sagaExecutionId));

    // Step 상태 초기화
    await this.db
      .update(sagaSteps)
      .set({ status: StepStatus.PENDING, retryCount: 0, errorMessage: null, startedAt: null, completedAt: null })
      .where(eq(sagaSteps.sagaExecutionId, sagaExecutionId));

    const payload = execution.payload as Record<string, unknown>;
    const result = await this.executeSteps(sagaExecutionId, definition, payload);

    return NatsResponse.success({ sagaExecutionId, ...result });
  }

  /**
   * Saga 수동 완료 처리
   */
  async resolveSaga(sagaExecutionId: number, adminNote?: string) {
    const [execution] = await this.db
      .select()
      .from(sagaExecutions)
      .where(eq(sagaExecutions.id, sagaExecutionId))
      .limit(1);

    if (!execution) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    if (execution.status !== SagaStatus.REQUIRES_MANUAL) {
      return NatsResponse.success({ error: `Cannot resolve saga in status: ${execution.status}` });
    }

    await this.db
      .update(sagaExecutions)
      .set({
        status: SagaStatus.COMPLETED,
        completedAt: new Date(),
        payload: {
          ...(execution.payload as Record<string, unknown>),
          resolvedManually: true,
          adminNote,
        },
      })
      .where(eq(sagaExecutions.id, sagaExecutionId));

    this.logger.log(`[SagaEngine] Saga ${sagaExecutionId} manually resolved`);
    return NatsResponse.success({ sagaExecutionId, sagaStatus: 'COMPLETED', resolvedManually: true });
  }

  /**
   * Saga 목록 조회
   */
  async listSagas(filters: { sagaType?: string; status?: string; page?: number; limit?: number }) {
    const { sagaType, status, page = 1, limit = 20 } = filters;
    const conds: SQL[] = [];
    if (sagaType) conds.push(eq(sagaExecutions.sagaType, sagaType));
    if (status) conds.push(eq(sagaExecutions.status, status as SagaStatus));
    const where = conds.length ? and(...conds) : undefined;

    const [sagas, totalRows] = await Promise.all([
      this.db.query.sagaExecutions.findMany({
        where,
        with: { steps: { orderBy: asc(sagaSteps.stepIndex) } },
        orderBy: desc(sagaExecutions.startedAt),
        limit,
        offset: (page - 1) * limit,
      }),
      this.db.select({ value: count() }).from(sagaExecutions).where(where),
    ]);

    return NatsResponse.paginated(sagas, totalRows[0].value, page, limit);
  }

  /**
   * Saga 상세 조회
   */
  async getSaga(sagaExecutionId: number) {
    const saga = await this.db.query.sagaExecutions.findFirst({
      where: eq(sagaExecutions.id, sagaExecutionId),
      with: { steps: { orderBy: asc(sagaSteps.stepIndex) } },
    });

    if (!saga) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    return NatsResponse.success(saga);
  }

  /**
   * Saga 통계
   */
  async getStats(dateRange?: { startDate: string; endDate: string }) {
    const base = dateRange
      ? and(
          gte(sagaExecutions.startedAt, new Date(dateRange.startDate)),
          lte(sagaExecutions.startedAt, new Date(dateRange.endDate)),
        )
      : undefined;

    const countWhere = (extra?: SQL) =>
      this.db
        .select({ value: count() })
        .from(sagaExecutions)
        .where(extra ? (base ? and(base, extra) : extra) : base);

    const results = await Promise.all([
      countWhere(),
      countWhere(eq(sagaExecutions.status, SagaStatus.COMPLETED)),
      countWhere(eq(sagaExecutions.status, SagaStatus.FAILED)),
      countWhere(eq(sagaExecutions.status, SagaStatus.REQUIRES_MANUAL)),
      countWhere(
        inArray(sagaExecutions.status, [
          SagaStatus.STARTED,
          SagaStatus.STEP_EXECUTING,
          SagaStatus.STEP_COMPLETED,
        ]),
      ),
    ]);
    const [total, completed, failed, requiresManual, active] = results.map((r) => r[0].value);

    return NatsResponse.success({
      total,
      completed,
      failed,
      requiresManual,
      active,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  private updateStepStatus(sagaExecutionId: number, stepIndex: number, status: StepStatus) {
    return this.db
      .update(sagaSteps)
      .set({ status, completedAt: new Date() })
      .where(and(eq(sagaSteps.sagaExecutionId, sagaExecutionId), eq(sagaSteps.stepIndex, stepIndex)));
  }

  private buildCorrelationId(sagaType: string, payload: Record<string, unknown>): string {
    if (payload.idempotencyKey) return `${sagaType}:${payload.idempotencyKey}`;
    if (payload.bookingId) return `${sagaType}:booking:${payload.bookingId}`;
    return `${sagaType}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
