import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SagaStatus, StepStatus } from '@prisma/client';
import { SagaRegistry } from './saga-registry';
import { StepExecutorService } from './step-executor.service';
import { SagaDefinition, StepDefinition } from '../definitions/saga-definition.interface';
import { NatsResponse, type SagaMeta } from '../../common/types/response.types';
import { PgBossService } from '../../common/pgboss/pgboss.service';

const SAGA_TIMEOUT_RECOVERY_QUEUE = 'saga-timeout-recovery';
const SAGA_TIMEOUT_DELAY_SECONDS = 15 * 60; // 15분

// CREATE_BOOKING 후 결제 미완료 시 자동 정리용 큐
const PAYMENT_TIMEOUT_QUEUE = 'payment-timeout';
const PAYMENT_TIMEOUT_DELAY_SECONDS = 5 * 60; // 5분

@Injectable()
export class SagaEngineService {
  private readonly logger = new Logger(SagaEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SagaRegistry,
    private readonly stepExecutor: StepExecutorService,
    private readonly pgboss: PgBossService,
  ) {}

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
    const existing = await this.prisma.sagaExecution.findUnique({
      where: { correlationId },
    });
    if (existing && existing.status !== SagaStatus.FAILED) {
      this.logger.warn(`[SagaEngine] Duplicate saga: ${correlationId}, status=${existing.status}`);
      const existingPayload = (existing.payload as Record<string, unknown>) ?? {};
      return NatsResponse.withSaga(existingPayload, {
        executionId: existing.id,
        status: existing.status as SagaMeta['status'],
        duplicate: true,
      });
    }

    // SagaExecution 생성 + 모든 SagaStep 레코드 생성
    const sagaExecution = await this.prisma.$transaction(async (prisma) => {
      // FAILED 상태의 이전 실행이 있으면 삭제 후 재생성
      if (existing && existing.status === SagaStatus.FAILED) {
        this.logger.log(`[SagaEngine] Removing FAILED saga ${existing.id} for retry: ${correlationId}`);
        await prisma.sagaStep.deleteMany({ where: { sagaExecutionId: existing.id } });
        await prisma.sagaExecution.delete({ where: { id: existing.id } });
      }

      const execution = await prisma.sagaExecution.create({
        data: {
          sagaType,
          correlationId,
          status: SagaStatus.STARTED,
          currentStep: 0,
          totalSteps: definition.steps.length,
          payload: payload as any,
          triggeredBy,
          triggeredById,
        },
      });

      // 모든 Step 레코드 미리 생성
      for (let i = 0; i < definition.steps.length; i++) {
        const step = definition.steps[i];
        await prisma.sagaStep.create({
          data: {
            sagaExecutionId: execution.id,
            stepIndex: i,
            stepName: step.name,
            actionPattern: step.action,
            status: StepStatus.PENDING,
            compensatePattern: step.compensate,
          },
        });
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
        await this.prisma.sagaExecution.update({
          where: { id: sagaExecution.id },
          data: { timeoutJobId },
        });
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
        // 이미 처리됐거나 cancel 실패해도 saga 자체는 종료된 상태이므로 문제 없음
        this.logger.debug(`[SagaEngine] timeout task cancel skipped: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    // CREATE_BOOKING saga가 정상 종료 + paymentMethod가 결제 대기인 경우
    //   → 5분 후 PAYMENT_TIMEOUT saga 발화 예약 (잠수 시나리오 대응)
    // singletonKey로 중복 enqueue 방지 (saga 재시도 시 안전).
    if (
      sagaType === 'CREATE_BOOKING' &&
      result.sagaStatus === SagaStatus.COMPLETED &&
      (result as { paymentMethod?: string }).paymentMethod &&
      (result as { paymentMethod?: string }).paymentMethod !== 'onsite' &&
      (result as { bookingId?: number }).bookingId
    ) {
      const bookingId = (result as { bookingId: number }).bookingId;
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
   *
   * - saga가 15분 이상 active 상태로 남아있으면 호출됨
   * - 멱등성: 이미 종료된 saga면 skip
   * - 보상 트랜잭션 자동 실행하여 정합성 회복
   */
  async recoverTimedOutSaga(sagaExecutionId: number) {
    const saga = await this.prisma.sagaExecution.findUnique({
      where: { id: sagaExecutionId },
      include: { steps: true },
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
      await this.prisma.sagaExecution.update({
        where: { id: sagaExecutionId },
        data: {
          status: SagaStatus.REQUIRES_MANUAL,
          failReason: `Timed out + saga definition not found: ${saga.sagaType}`,
          failedAt: new Date(),
        },
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

    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: {
        status: finalStatus,
        failReason: 'Saga timeout — auto recovery via pg-boss',
        failedAt: new Date(),
      },
    });

    this.logger.warn(
      `[SagaEngine] Saga ${sagaExecutionId} timeout recovery complete: ${finalStatus}`,
    );

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

    for (let i = 0; i < definition.steps.length; i++) {
      const stepDef = definition.steps[i];

      // 조건부 실행 체크
      if (stepDef.condition && !stepDef.condition(currentPayload)) {
        this.logger.log(`[SagaEngine] Step ${i}/${definition.steps.length} ${stepDef.name} SKIPPED (condition not met)`);
        await this.updateStepStatus(sagaExecutionId, i, StepStatus.SKIPPED);
        continue;
      }

      // SagaExecution 상태 업데이트
      await this.prisma.sagaExecution.update({
        where: { id: sagaExecutionId },
        data: { status: SagaStatus.STEP_EXECUTING, currentStep: i },
      });

      // Step용 요청 데이터 빌드
      const requestPayload = stepDef.buildRequest(currentPayload);

      // Step 시작 기록
      await this.prisma.sagaStep.updateMany({
        where: { sagaExecutionId, stepIndex: i },
        data: {
          status: StepStatus.EXECUTING,
          startedAt: new Date(),
          requestPayload: requestPayload as any,
        },
      });

      this.logger.log(`[SagaEngine] Step ${i + 1}/${definition.steps.length} ${stepDef.name} executing`);

      // Step 실행
      const result = await this.stepExecutor.executeStep(stepDef, requestPayload);

      if (result.success) {
        // Step 성공
        await this.prisma.sagaStep.updateMany({
          where: { sagaExecutionId, stepIndex: i },
          data: {
            status: StepStatus.COMPLETED,
            completedAt: new Date(),
            responsePayload: (result.data || {}) as any,
          },
        });

        // 응답을 payload에 병합
        if (stepDef.mergeResponse && result.data) {
          currentPayload = stepDef.mergeResponse(currentPayload, result.data);
        }

        await this.prisma.sagaExecution.update({
          where: { id: sagaExecutionId },
          data: { status: SagaStatus.STEP_COMPLETED, payload: currentPayload as any },
        });
      } else {
        // Step 실패
        await this.prisma.sagaStep.updateMany({
          where: { sagaExecutionId, stepIndex: i },
          data: {
            status: StepStatus.FAILED,
            completedAt: new Date(),
            errorMessage: result.error,
          },
        });

        if (stepDef.optional) {
          // Optional step 실패 → SKIPPED 후 계속
          this.logger.warn(`[SagaEngine] Optional step ${stepDef.name} failed, skipping: ${result.error}`);
          await this.updateStepStatus(sagaExecutionId, i, StepStatus.SKIPPED);
          continue;
        }

        // 필수 Step 실패 → 보상 시작
        this.logger.error(`[SagaEngine] Step ${stepDef.name} FAILED: ${result.error}`);
        await this.prisma.sagaExecution.update({
          where: { id: sagaExecutionId },
          data: { status: SagaStatus.STEP_FAILED, failReason: result.error },
        });

        // 보상 트랜잭션 실행
        const compensationSuccess = await this.runCompensation(
          sagaExecutionId, definition, i, currentPayload,
        );

        const finalStatus = compensationSuccess
          ? SagaStatus.FAILED
          : SagaStatus.REQUIRES_MANUAL;

        await this.prisma.sagaExecution.update({
          where: { id: sagaExecutionId },
          data: {
            status: finalStatus,
            failReason: result.error,
            failedAt: new Date(),
          },
        });

        return { sagaStatus: finalStatus, ...currentPayload, failReason: result.error };
      }
    }

    // 모든 Step 성공
    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: {
        status: SagaStatus.COMPLETED,
        completedAt: new Date(),
        payload: currentPayload as any,
      },
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

    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: { status: SagaStatus.COMPENSATING },
    });

    let allCompensated = true;

    // 실패한 Step 이전의 완료된 Step을 역순으로 보상
    for (let i = failedStepIndex - 1; i >= 0; i--) {
      const stepDef = definition.steps[i];

      if (!stepDef.compensate) {
        this.logger.log(`[SagaEngine] Step ${stepDef.name} has no compensation, skipping`);
        continue;
      }

      // 해당 Step이 실제로 완료되었는지 확인
      const sagaStep = await this.prisma.sagaStep.findFirst({
        where: { sagaExecutionId, stepIndex: i },
      });

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
        await this.prisma.sagaStep.updateMany({
          where: { sagaExecutionId, stepIndex: i },
          data: { status: StepStatus.COMPENSATED },
        });
        this.logger.log(`[SagaEngine] Compensation for ${stepDef.name} SUCCESS`);
      } else {
        this.logger.error(`[SagaEngine] Compensation for ${stepDef.name} FAILED: ${result.error}`);
        allCompensated = false;
      }
    }

    const compensationStatus = allCompensated
      ? SagaStatus.COMPENSATION_COMPLETED
      : SagaStatus.COMPENSATION_FAILED;

    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: { status: compensationStatus },
    });

    return allCompensated;
  }

  /**
   * 실패한 Saga 재시도
   */
  async retrySaga(sagaExecutionId: number) {
    const execution = await this.prisma.sagaExecution.findUnique({
      where: { id: sagaExecutionId },
    });

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
    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: {
        status: SagaStatus.STARTED,
        currentStep: 0,
        failReason: null,
        failedAt: null,
      },
    });

    // Step 상태 초기화
    await this.prisma.sagaStep.updateMany({
      where: { sagaExecutionId },
      data: {
        status: StepStatus.PENDING,
        retryCount: 0,
        errorMessage: null,
        startedAt: null,
        completedAt: null,
      },
    });

    const payload = execution.payload as Record<string, unknown>;
    const result = await this.executeSteps(sagaExecutionId, definition, payload);

    return NatsResponse.success({ sagaExecutionId, ...result });
  }

  /**
   * Saga 수동 완료 처리 (sagaStatus는 이미 result에 포함)
   */
  async resolveSaga(sagaExecutionId: number, adminNote?: string) {
    const execution = await this.prisma.sagaExecution.findUnique({
      where: { id: sagaExecutionId },
    });

    if (!execution) {
      return NatsResponse.success({ error: 'Saga not found' });
    }

    if (execution.status !== SagaStatus.REQUIRES_MANUAL) {
      return NatsResponse.success({ error: `Cannot resolve saga in status: ${execution.status}` });
    }

    await this.prisma.sagaExecution.update({
      where: { id: sagaExecutionId },
      data: {
        status: SagaStatus.COMPLETED,
        completedAt: new Date(),
        payload: {
          ...(execution.payload as Record<string, unknown>),
          resolvedManually: true,
          adminNote,
        } as any,
      },
    });

    this.logger.log(`[SagaEngine] Saga ${sagaExecutionId} manually resolved`);
    return NatsResponse.success({ sagaExecutionId, sagaStatus: 'COMPLETED', resolvedManually: true });
  }

  /**
   * Saga 목록 조회
   */
  async listSagas(filters: {
    sagaType?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { sagaType, status, page = 1, limit = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (sagaType) where.sagaType = sagaType;
    if (status) where.status = status;

    const [sagas, total] = await Promise.all([
      this.prisma.sagaExecution.findMany({
        where,
        include: { steps: { orderBy: { stepIndex: 'asc' } } },
        orderBy: { startedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.sagaExecution.count({ where }),
    ]);

    return NatsResponse.paginated(sagas, total, page, limit);
  }

  /**
   * Saga 상세 조회
   */
  async getSaga(sagaExecutionId: number) {
    const saga = await this.prisma.sagaExecution.findUnique({
      where: { id: sagaExecutionId },
      include: { steps: { orderBy: { stepIndex: 'asc' } } },
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
    const where: Record<string, unknown> = {};
    if (dateRange) {
      where.startedAt = {
        gte: new Date(dateRange.startDate),
        lte: new Date(dateRange.endDate),
      };
    }

    const [total, completed, failed, requiresManual, active] = await Promise.all([
      this.prisma.sagaExecution.count({ where }),
      this.prisma.sagaExecution.count({ where: { ...where, status: SagaStatus.COMPLETED } }),
      this.prisma.sagaExecution.count({ where: { ...where, status: SagaStatus.FAILED } }),
      this.prisma.sagaExecution.count({ where: { ...where, status: SagaStatus.REQUIRES_MANUAL } }),
      this.prisma.sagaExecution.count({
        where: {
          ...where,
          status: { in: [SagaStatus.STARTED, SagaStatus.STEP_EXECUTING, SagaStatus.STEP_COMPLETED] },
        },
      }),
    ]);

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
    return this.prisma.sagaStep.updateMany({
      where: { sagaExecutionId, stepIndex },
      data: { status, completedAt: new Date() },
    });
  }

  private buildCorrelationId(sagaType: string, payload: Record<string, unknown>): string {
    if (payload.idempotencyKey) return `${sagaType}:${payload.idempotencyKey}`;
    if (payload.bookingId) return `${sagaType}:booking:${payload.bookingId}`;
    return `${sagaType}:${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
}
