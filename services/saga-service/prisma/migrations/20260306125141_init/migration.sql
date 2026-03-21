-- CreateEnum
CREATE TYPE "SagaStatus" AS ENUM ('STARTED', 'STEP_EXECUTING', 'STEP_COMPLETED', 'COMPLETED', 'STEP_FAILED', 'COMPENSATING', 'COMPENSATION_COMPLETED', 'COMPENSATION_FAILED', 'FAILED', 'REQUIRES_MANUAL');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'EXECUTING', 'COMPLETED', 'FAILED', 'COMPENSATED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "saga_executions" (
    "id" SERIAL NOT NULL,
    "saga_type" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "status" "SagaStatus" NOT NULL DEFAULT 'STARTED',
    "current_step" INTEGER NOT NULL DEFAULT 0,
    "total_steps" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "fail_reason" TEXT,
    "triggered_by" TEXT,
    "triggered_by_id" INTEGER,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "failed_at" TIMESTAMP(3),

    CONSTRAINT "saga_executions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saga_steps" (
    "id" SERIAL NOT NULL,
    "saga_execution_id" INTEGER NOT NULL,
    "step_index" INTEGER NOT NULL,
    "step_name" TEXT NOT NULL,
    "action_pattern" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "request_payload" JSONB,
    "response_payload" JSONB,
    "error_message" TEXT,
    "is_compensation" BOOLEAN NOT NULL DEFAULT false,
    "compensate_pattern" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "saga_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" SERIAL NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "saga_executions_correlation_id_key" ON "saga_executions"("correlation_id");

-- CreateIndex
CREATE INDEX "saga_executions_saga_type_status_idx" ON "saga_executions"("saga_type", "status");

-- CreateIndex
CREATE INDEX "saga_executions_correlation_id_idx" ON "saga_executions"("correlation_id");

-- CreateIndex
CREATE INDEX "saga_executions_status_started_at_idx" ON "saga_executions"("status", "started_at");

-- CreateIndex
CREATE INDEX "saga_steps_saga_execution_id_step_index_idx" ON "saga_steps"("saga_execution_id", "step_index");

-- CreateIndex
CREATE INDEX "saga_steps_status_idx" ON "saga_steps"("status");

-- CreateIndex
CREATE INDEX "outbox_events_status_created_at_idx" ON "outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "outbox_events_aggregate_type_aggregate_id_idx" ON "outbox_events"("aggregate_type", "aggregate_id");

-- AddForeignKey
ALTER TABLE "saga_steps" ADD CONSTRAINT "saga_steps_saga_execution_id_fkey" FOREIGN KEY ("saga_execution_id") REFERENCES "saga_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
