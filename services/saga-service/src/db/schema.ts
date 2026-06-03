// ==============================================
// saga-service / saga_db — Drizzle schema (UNI-84)
// 컬럼명은 기존 DB(@map snake_case) 유지 → DB 무변경. updatedAt 없음.
// ==============================================
import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { SAGA_STATUS_VALUES, STEP_STATUS_VALUES } from '../contracts/enums';

export const sagaStatusEnum = pgEnum('SagaStatus', SAGA_STATUS_VALUES);
export const stepStatusEnum = pgEnum('StepStatus', STEP_STATUS_VALUES);

export const sagaExecutions = pgTable(
  'saga_executions',
  {
    id: serial('id').primaryKey(),
    sagaType: text('saga_type').notNull(),
    correlationId: text('correlation_id').notNull(),
    status: sagaStatusEnum('status').notNull().default('STARTED'),
    currentStep: integer('current_step').notNull().default(0),
    totalSteps: integer('total_steps').notNull(),
    payload: jsonb('payload').notNull(),
    failReason: text('fail_reason'),
    timeoutJobId: text('timeout_job_id'),
    triggeredBy: text('triggered_by'),
    triggeredById: integer('triggered_by_id'),
    startedAt: timestamp('started_at', { precision: 3 }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { precision: 3 }),
    failedAt: timestamp('failed_at', { precision: 3 }),
  },
  (t) => [
    uniqueIndex('saga_executions_correlation_id_key').on(t.correlationId),
    index('saga_executions_saga_type_status_idx').on(t.sagaType, t.status),
    index('saga_executions_status_started_at_idx').on(t.status, t.startedAt),
  ],
);

export const sagaSteps = pgTable(
  'saga_steps',
  {
    id: serial('id').primaryKey(),
    sagaExecutionId: integer('saga_execution_id')
      .notNull()
      .references(() => sagaExecutions.id, { onDelete: 'cascade' }),
    stepIndex: integer('step_index').notNull(),
    stepName: text('step_name').notNull(),
    actionPattern: text('action_pattern').notNull(),
    status: stepStatusEnum('status').notNull().default('PENDING'),
    retryCount: integer('retry_count').notNull().default(0),
    requestPayload: jsonb('request_payload'),
    responsePayload: jsonb('response_payload'),
    errorMessage: text('error_message'),
    isCompensation: boolean('is_compensation').notNull().default(false),
    compensatePattern: text('compensate_pattern'),
    startedAt: timestamp('started_at', { precision: 3 }),
    completedAt: timestamp('completed_at', { precision: 3 }),
  },
  (t) => [
    index('saga_steps_saga_execution_id_step_index_idx').on(t.sagaExecutionId, t.stepIndex),
    index('saga_steps_status_idx').on(t.status),
  ],
);

export const sagaExecutionsRelations = relations(sagaExecutions, ({ many }) => ({
  steps: many(sagaSteps),
}));
export const sagaStepsRelations = relations(sagaSteps, ({ one }) => ({
  sagaExecution: one(sagaExecutions, { fields: [sagaSteps.sagaExecutionId], references: [sagaExecutions.id] }),
}));

export type SagaExecutionRow = typeof sagaExecutions.$inferSelect;
export type SagaStepRow = typeof sagaSteps.$inferSelect;
