CREATE TYPE "public"."SettlementCycle" AS ENUM('DAILY', 'WEEKLY', 'MONTHLY');--> statement-breakpoint
CREATE TYPE "public"."SettlementStatus" AS ENUM('PENDING', 'RECONCILED', 'PAID');--> statement-breakpoint
CREATE TABLE "settlements" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"company_id" integer,
	"provider" "PgProvider" NOT NULL,
	"cycle" "SettlementCycle" NOT NULL,
	"period_key" text NOT NULL,
	"period_start" timestamp (3) NOT NULL,
	"period_end" timestamp (3) NOT NULL,
	"gross_amount" integer NOT NULL,
	"refund_amount" integer NOT NULL,
	"net_amount" integer NOT NULL,
	"fee_rate" integer NOT NULL,
	"fee_amount" integer NOT NULL,
	"payout_amount" integer NOT NULL,
	"count" integer NOT NULL,
	"status" "SettlementStatus" DEFAULT 'PENDING' NOT NULL,
	"reconciled_at" timestamp (3),
	"paid_at" timestamp (3),
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pg_configs" ADD COLUMN "fee_rate" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "settlements_club_provider_period_key" ON "settlements" USING btree ("club_id","provider","cycle","period_key");--> statement-breakpoint
CREATE INDEX "settlements_status_idx" ON "settlements" USING btree ("status");