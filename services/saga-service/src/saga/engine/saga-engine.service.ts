import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SagaStatus, StepStatus } from '@prisma/client';
import { SagaRegistry } from './saga-registry';
import { StepExecutorService } from './step-executor.service';
import { SagaDefinition, StepDefinition } from '../definitions/saga-definition.interface';
import { NatsResponse } from '../../common/types/response.types';

@Injectable()
export class SagaEngineService {
  private readonly logger = new Logger(SagaEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: SagaRegistry,
    private readonly stepExecutor: StepExecutorService,
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
      return NatsResponse.success({ error: `Unknown saga type: ${sagaType}` });
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
      return NatsResponse.success({ sagaExecutionId: existing.id, status: existing.status, duplicate: true });
    }

    // SagaExecution 생성 + 모든 SagaStep 레코드 생성
    const sagaExecution = await this.prisma.$transaction(async (prisma) => {
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

    // Step들을 순차 실행
    const result = await this.executeSteps(sagaExecution.id, definition, payload);
    const elapsed = Date.now() - startTime;

    this.logger.log(`[SagaEngine] Saga ${sagaType} ${result.status} in ${elapsed}ms: executionId=${sagaExecution.id}`);
    this.logger.log(`[SagaEngine] ========== SAGA ${sagaType} ${result.status} ==========`);

    return NatsResponse.success({
      sagaExecutionId: sagaExecution.id,
      ...result,
    });
  }

  /**
   * Step들을 순차 실행
   */
  private async executeSteps(
    sagaExecutionId: number,
    definition: SagaDefinition,
    initialPayload: Record<string, unknown>,
  ): Promise<{ status: string; payload: Record<string, unknown>; failReason?: string }> {
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

        return { status: finalStatus, payload: currentPayload, failReason: result.error };
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

    return { status: 'COMPLETED', payload: currentPayload };
  }

  /**
   * 보상 트랜잭션 실행 (완료된 Step을 역순으로)
   */
  private async runCompensation(
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
   * Saga 수동 완료 처리
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
    return NatsResponse.success({ sagaExecutionId, status: 'COMPLETED', resolvedManually: true });
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
