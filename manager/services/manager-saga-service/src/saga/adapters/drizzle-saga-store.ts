import { Injectable } from '@nestjs/common';
import { eq, and, count, asc, desc, gte, lte, inArray, type SQL } from 'drizzle-orm';
import {
  SagaStatus,
  StepStatus,
  type SagaStorePort,
  type SagaExecutionRow,
  type SagaStepRow,
  type CreateExecutionInput,
  type NewStepSeed,
  type ExecutionPatch,
  type StepPatch,
  type ListFilters,
  type DateRange,
  type SagaStats,
} from '@uniyous/saga-engine';
import { DrizzleService } from '../../db/drizzle.service';
import { sagaExecutions, sagaSteps } from '../../db/schema';

/**
 * SagaStorePort의 Drizzle/manager_saga_db 어댑터 (UNI-127 ②).
 * 쿼리는 구 SagaEngineService에서 verbatim 이관 — DB 동작 기능변경 0.
 */
@Injectable()
export class DrizzleSagaStore implements SagaStorePort {
  constructor(private readonly drizzle: DrizzleService) {}

  private get db() {
    return this.drizzle.db;
  }

  async findByCorrelationId(correlationId: string): Promise<SagaExecutionRow | undefined> {
    const [existing] = await this.db
      .select()
      .from(sagaExecutions)
      .where(eq(sagaExecutions.correlationId, correlationId))
      .limit(1);
    return existing as SagaExecutionRow | undefined;
  }

  async findById(executionId: number): Promise<SagaExecutionRow | undefined> {
    const [execution] = await this.db
      .select()
      .from(sagaExecutions)
      .where(eq(sagaExecutions.id, executionId))
      .limit(1);
    return execution as SagaExecutionRow | undefined;
  }

  async findWithSteps(
    executionId: number,
    opts?: { orderSteps?: boolean },
  ): Promise<(SagaExecutionRow & { steps: SagaStepRow[] }) | undefined> {
    const saga = await this.db.query.sagaExecutions.findFirst({
      where: eq(sagaExecutions.id, executionId),
      with: { steps: opts?.orderSteps ? { orderBy: asc(sagaSteps.stepIndex) } : true },
    });
    return saga as (SagaExecutionRow & { steps: SagaStepRow[] }) | undefined;
  }

  async getStep(executionId: number, stepIndex: number): Promise<SagaStepRow | undefined> {
    const [sagaStep] = await this.db
      .select()
      .from(sagaSteps)
      .where(and(eq(sagaSteps.sagaExecutionId, executionId), eq(sagaSteps.stepIndex, stepIndex)))
      .limit(1);
    return sagaStep as SagaStepRow | undefined;
  }

  async createExecutionWithSteps(
    input: CreateExecutionInput,
    steps: NewStepSeed[],
    replaceFailedExecutionId?: number,
  ): Promise<SagaExecutionRow> {
    const execution = await this.db.transaction(async (tx) => {
      // FAILED 상태의 이전 실행이 있으면 삭제 후 재생성
      if (replaceFailedExecutionId) {
        await tx.delete(sagaSteps).where(eq(sagaSteps.sagaExecutionId, replaceFailedExecutionId));
        await tx.delete(sagaExecutions).where(eq(sagaExecutions.id, replaceFailedExecutionId));
      }

      const [created] = await tx
        .insert(sagaExecutions)
        .values({
          sagaType: input.sagaType,
          correlationId: input.correlationId,
          status: input.status,
          currentStep: input.currentStep,
          totalSteps: input.totalSteps,
          payload: input.payload,
          triggeredBy: input.triggeredBy,
          triggeredById: input.triggeredById,
        })
        .returning();

      // 모든 Step 레코드 미리 생성
      if (steps.length > 0) {
        await tx.insert(sagaSteps).values(
          steps.map((step) => ({
            sagaExecutionId: created.id,
            stepIndex: step.stepIndex,
            stepName: step.stepName,
            actionPattern: step.actionPattern,
            status: StepStatus.PENDING,
            compensatePattern: step.compensatePattern,
          })),
        );
      }

      return created;
    });

    return execution as SagaExecutionRow;
  }

  async updateExecution(executionId: number, patch: ExecutionPatch): Promise<void> {
    await this.db.update(sagaExecutions).set(patch).where(eq(sagaExecutions.id, executionId));
  }

  async updateStep(executionId: number, stepIndex: number, patch: StepPatch): Promise<void> {
    await this.db
      .update(sagaSteps)
      .set(patch)
      .where(and(eq(sagaSteps.sagaExecutionId, executionId), eq(sagaSteps.stepIndex, stepIndex)));
  }

  async resetForRetry(executionId: number): Promise<void> {
    await this.db
      .update(sagaExecutions)
      .set({ status: SagaStatus.STARTED, currentStep: 0, failReason: null, failedAt: null })
      .where(eq(sagaExecutions.id, executionId));

    await this.db
      .update(sagaSteps)
      .set({ status: StepStatus.PENDING, retryCount: 0, errorMessage: null, startedAt: null, completedAt: null })
      .where(eq(sagaSteps.sagaExecutionId, executionId));
  }

  async list(
    filters: ListFilters,
  ): Promise<{ rows: (SagaExecutionRow & { steps: SagaStepRow[] })[]; total: number }> {
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

    return {
      rows: sagas as (SagaExecutionRow & { steps: SagaStepRow[] })[],
      total: totalRows[0].value,
    };
  }

  async getStats(range?: DateRange): Promise<SagaStats> {
    const base = range
      ? and(
          gte(sagaExecutions.startedAt, new Date(range.startDate)),
          lte(sagaExecutions.startedAt, new Date(range.endDate)),
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

    return { total, completed, failed, requiresManual, active };
  }
}
