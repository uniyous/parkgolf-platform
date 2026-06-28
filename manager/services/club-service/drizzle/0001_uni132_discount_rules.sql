-- UNI-132 — 요금 할인 규칙(discount_rules). "PolicyScope" 타입은 기존 정책 테이블에서 이미 생성됨.
CREATE TYPE "public"."DiscountKind" AS ENUM('PROMOTION', 'EVENT', 'MEMBER', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."DiscountAmountType" AS ENUM('FIXED', 'RATE');--> statement-breakpoint
CREATE TYPE "public"."DiscountAppliesTo" AS ENUM('PER_PLAYER', 'PER_BOOKING');--> statement-breakpoint
CREATE TABLE "discount_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_level" "PolicyScope" NOT NULL,
	"company_id" integer,
	"club_id" integer,
	"kind" "DiscountKind" NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"amount_type" "DiscountAmountType" NOT NULL,
	"amount_value" integer NOT NULL,
	"applies_to" "DiscountAppliesTo" DEFAULT 'PER_PLAYER' NOT NULL,
	"eligibility" jsonb,
	"valid_from" timestamp (3),
	"valid_to" timestamp (3),
	"stackable" boolean DEFAULT false NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"max_discount_amount" integer,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "discount_rules_scope_idx" ON "discount_rules" USING btree ("scope_level","company_id","club_id");--> statement-breakpoint
CREATE INDEX "discount_rules_active_idx" ON "discount_rules" USING btree ("active");
