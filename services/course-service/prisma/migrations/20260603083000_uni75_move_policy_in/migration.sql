-- CreateEnum
CREATE TYPE "PolicyScope" AS ENUM ('PLATFORM', 'COMPANY', 'CLUB');

-- CreateEnum
CREATE TYPE "NoShowPenaltyType" AS ENUM ('WARNING', 'RESTRICTION', 'FEE', 'BLACKLIST');

-- CreateTable
CREATE TABLE "cancellation_policies" (
    "id" SERIAL NOT NULL,
    "scope_level" "PolicyScope" NOT NULL DEFAULT 'PLATFORM',
    "company_id" INTEGER,
    "club_id" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "allow_user_cancel" BOOLEAN NOT NULL DEFAULT true,
    "user_cancel_deadline_hours" INTEGER NOT NULL DEFAULT 72,
    "allow_same_day_cancel" BOOLEAN NOT NULL DEFAULT false,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cancellation_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_policies" (
    "id" SERIAL NOT NULL,
    "scope_level" "PolicyScope" NOT NULL DEFAULT 'PLATFORM',
    "company_id" INTEGER,
    "club_id" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "admin_cancel_refund_rate" INTEGER NOT NULL DEFAULT 100,
    "system_cancel_refund_rate" INTEGER NOT NULL DEFAULT 100,
    "min_refund_amount" INTEGER NOT NULL DEFAULT 0,
    "refund_fee" INTEGER NOT NULL DEFAULT 0,
    "refund_fee_rate" INTEGER NOT NULL DEFAULT 0,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_tiers" (
    "id" SERIAL NOT NULL,
    "refund_policy_id" INTEGER NOT NULL,
    "min_hours_before" INTEGER NOT NULL,
    "max_hours_before" INTEGER,
    "refund_rate" INTEGER NOT NULL,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noshow_policies" (
    "id" SERIAL NOT NULL,
    "scope_level" "PolicyScope" NOT NULL DEFAULT 'PLATFORM',
    "company_id" INTEGER,
    "club_id" INTEGER,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "allow_refund_on_noshow" BOOLEAN NOT NULL DEFAULT false,
    "noshow_grace_minutes" INTEGER NOT NULL DEFAULT 30,
    "count_reset_days" INTEGER NOT NULL DEFAULT 365,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noshow_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "noshow_penalties" (
    "id" SERIAL NOT NULL,
    "noshow_policy_id" INTEGER NOT NULL,
    "min_count" INTEGER NOT NULL,
    "max_count" INTEGER,
    "penalty_type" "NoShowPenaltyType" NOT NULL,
    "restriction_days" INTEGER,
    "fee_amount" INTEGER,
    "fee_rate" INTEGER,
    "label" TEXT,
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "noshow_penalties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_noshow_records" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "noshow_at" TIMESTAMP(3) NOT NULL,
    "processed_by" INTEGER,
    "notes" TEXT,
    "is_reset" BOOLEAN NOT NULL DEFAULT false,
    "reset_at" TIMESTAMP(3),
    "reset_by" INTEGER,
    "reset_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_noshow_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_policies" (
    "id" SERIAL NOT NULL,
    "scope_level" "PolicyScope" NOT NULL DEFAULT 'COMPANY',
    "company_id" INTEGER,
    "club_id" INTEGER,
    "open_time" TEXT NOT NULL DEFAULT '06:00',
    "close_time" TEXT NOT NULL DEFAULT '18:00',
    "last_tee_time" TEXT,
    "default_max_players" INTEGER NOT NULL DEFAULT 4,
    "default_duration" INTEGER NOT NULL DEFAULT 180,
    "default_break_duration" INTEGER NOT NULL DEFAULT 10,
    "default_slot_interval" INTEGER NOT NULL DEFAULT 10,
    "peak_season_start" TEXT,
    "peak_season_end" TEXT,
    "peak_price_rate" INTEGER NOT NULL DEFAULT 100,
    "weekend_price_rate" INTEGER NOT NULL DEFAULT 100,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operating_policies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cancellation_policies_scope_level_idx" ON "cancellation_policies"("scope_level");

-- CreateIndex
CREATE INDEX "cancellation_policies_company_id_idx" ON "cancellation_policies"("company_id");

-- CreateIndex
CREATE INDEX "cancellation_policies_club_id_idx" ON "cancellation_policies"("club_id");

-- CreateIndex
CREATE INDEX "cancellation_policies_is_active_idx" ON "cancellation_policies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "cancellation_policies_scope_level_company_id_club_id_key" ON "cancellation_policies"("scope_level", "company_id", "club_id");

-- CreateIndex
CREATE INDEX "refund_policies_scope_level_idx" ON "refund_policies"("scope_level");

-- CreateIndex
CREATE INDEX "refund_policies_company_id_idx" ON "refund_policies"("company_id");

-- CreateIndex
CREATE INDEX "refund_policies_club_id_idx" ON "refund_policies"("club_id");

-- CreateIndex
CREATE INDEX "refund_policies_is_active_idx" ON "refund_policies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "refund_policies_scope_level_company_id_club_id_key" ON "refund_policies"("scope_level", "company_id", "club_id");

-- CreateIndex
CREATE INDEX "refund_tiers_refund_policy_id_idx" ON "refund_tiers"("refund_policy_id");

-- CreateIndex
CREATE INDEX "noshow_policies_scope_level_idx" ON "noshow_policies"("scope_level");

-- CreateIndex
CREATE INDEX "noshow_policies_company_id_idx" ON "noshow_policies"("company_id");

-- CreateIndex
CREATE INDEX "noshow_policies_club_id_idx" ON "noshow_policies"("club_id");

-- CreateIndex
CREATE INDEX "noshow_policies_is_active_idx" ON "noshow_policies"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "noshow_policies_scope_level_company_id_club_id_key" ON "noshow_policies"("scope_level", "company_id", "club_id");

-- CreateIndex
CREATE INDEX "noshow_penalties_noshow_policy_id_idx" ON "noshow_penalties"("noshow_policy_id");

-- CreateIndex
CREATE INDEX "user_noshow_records_user_id_idx" ON "user_noshow_records"("user_id");

-- CreateIndex
CREATE INDEX "user_noshow_records_booking_id_idx" ON "user_noshow_records"("booking_id");

-- CreateIndex
CREATE INDEX "user_noshow_records_noshow_at_idx" ON "user_noshow_records"("noshow_at");

-- CreateIndex
CREATE INDEX "operating_policies_scope_level_idx" ON "operating_policies"("scope_level");

-- CreateIndex
CREATE INDEX "operating_policies_company_id_idx" ON "operating_policies"("company_id");

-- CreateIndex
CREATE INDEX "operating_policies_club_id_idx" ON "operating_policies"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "operating_policies_scope_level_company_id_club_id_key" ON "operating_policies"("scope_level", "company_id", "club_id");

-- AddForeignKey
ALTER TABLE "refund_tiers" ADD CONSTRAINT "refund_tiers_refund_policy_id_fkey" FOREIGN KEY ("refund_policy_id") REFERENCES "refund_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "noshow_penalties" ADD CONSTRAINT "noshow_penalties_noshow_policy_id_fkey" FOREIGN KEY ("noshow_policy_id") REFERENCES "noshow_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

