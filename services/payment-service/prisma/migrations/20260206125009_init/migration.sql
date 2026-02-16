-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'TRANSFER', 'VIRTUAL_ACCOUNT', 'EASY_PAY', 'MOBILE', 'GIFT_CERTIFICATE', 'CULTURE_GIFT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('READY', 'IN_PROGRESS', 'WAITING_FOR_DEPOSIT', 'DONE', 'CANCELED', 'PARTIAL_CANCELED', 'ABORTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'PROCESSED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "payment_key" TEXT,
    "order_id" TEXT NOT NULL,
    "order_name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "method" "PaymentMethod",
    "easy_pay_provider" TEXT,
    "card_company" TEXT,
    "card_company_name" TEXT,
    "card_number" TEXT,
    "card_type" TEXT,
    "owner_type" TEXT,
    "installment_months" INTEGER,
    "is_interest_free" BOOLEAN,
    "virtual_account_number" TEXT,
    "virtual_bank_code" TEXT,
    "virtual_bank_name" TEXT,
    "virtual_due_date" TIMESTAMP(3),
    "virtual_account_holder" TEXT,
    "transfer_bank_code" TEXT,
    "transfer_bank_name" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'READY',
    "user_id" INTEGER NOT NULL,
    "booking_id" INTEGER,
    "approved_at" TIMESTAMP(3),
    "requested_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "cancel_amount" INTEGER,
    "receipt_url" TEXT,
    "checkout_url" TEXT,
    "metadata" JSONB,
    "customer_name" TEXT,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "transaction_key" TEXT,
    "cancel_reason" TEXT NOT NULL,
    "cancel_amount" INTEGER NOT NULL,
    "tax_free_amount" INTEGER,
    "refund_status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "refund_bank_code" TEXT,
    "refund_bank_name" TEXT,
    "refund_account" TEXT,
    "refund_holder" TEXT,
    "refunded_at" TIMESTAMP(3),
    "requested_by" INTEGER,
    "requested_by_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_keys" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "billing_key" TEXT NOT NULL,
    "customer_key" TEXT NOT NULL,
    "authenticated_at" TIMESTAMP(3) NOT NULL,
    "card_company" TEXT NOT NULL,
    "card_company_name" TEXT,
    "card_number" TEXT NOT NULL,
    "card_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER,
    "event_type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "processed_at" TIMESTAMP(3),
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_outbox_events" (
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

    CONSTRAINT "payment_outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_key_key" ON "payments"("payment_key");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_booking_id_idx" ON "payments"("booking_id");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_created_at_idx" ON "payments"("created_at");

-- CreateIndex
CREATE INDEX "payments_method_idx" ON "payments"("method");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_transaction_key_key" ON "refunds"("transaction_key");

-- CreateIndex
CREATE INDEX "refunds_payment_id_idx" ON "refunds"("payment_id");

-- CreateIndex
CREATE INDEX "refunds_refund_status_idx" ON "refunds"("refund_status");

-- CreateIndex
CREATE UNIQUE INDEX "billing_keys_billing_key_key" ON "billing_keys"("billing_key");

-- CreateIndex
CREATE INDEX "billing_keys_user_id_idx" ON "billing_keys"("user_id");

-- CreateIndex
CREATE INDEX "billing_keys_is_active_idx" ON "billing_keys"("is_active");

-- CreateIndex
CREATE INDEX "webhook_logs_payment_id_idx" ON "webhook_logs"("payment_id");

-- CreateIndex
CREATE INDEX "webhook_logs_event_type_idx" ON "webhook_logs"("event_type");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_created_at_idx" ON "webhook_logs"("created_at");

-- CreateIndex
CREATE INDEX "payment_outbox_events_status_created_at_idx" ON "payment_outbox_events"("status", "created_at");

-- CreateIndex
CREATE INDEX "payment_outbox_events_aggregate_type_aggregate_id_idx" ON "payment_outbox_events"("aggregate_type", "aggregate_id");

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
