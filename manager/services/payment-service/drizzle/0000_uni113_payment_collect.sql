CREATE TYPE "public"."PaymentChannel" AS ENUM('DESK', 'PHONE', 'WALK_IN', 'KIOSK');--> statement-breakpoint
CREATE TYPE "public"."PaymentMethod" AS ENUM('CASH', 'CARD');--> statement-breakpoint
CREATE TYPE "public"."PaymentStatus" AS ENUM('COLLECTED', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "payment_closes" (
	"id" serial PRIMARY KEY NOT NULL,
	"close_date" text NOT NULL,
	"club_id" integer,
	"company_id" integer,
	"total_amount" integer NOT NULL,
	"count" integer NOT NULL,
	"closed_by" integer,
	"closed_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"club_id" integer,
	"company_id" integer,
	"amount" integer NOT NULL,
	"method" "PaymentMethod" NOT NULL,
	"channel" "PaymentChannel" DEFAULT 'DESK' NOT NULL,
	"status" "PaymentStatus" DEFAULT 'COLLECTED' NOT NULL,
	"receipt_id" text NOT NULL,
	"staff_id" integer,
	"kiosk_id" text,
	"collected_at" timestamp (3) DEFAULT now() NOT NULL,
	"refunded_at" timestamp (3)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_closes_date_club_key" ON "payment_closes" USING btree ("close_date","club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_booking_id_key" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_club_collected_idx" ON "payments" USING btree ("club_id","collected_at");--> statement-breakpoint
CREATE INDEX "payments_company_idx" ON "payments" USING btree ("company_id");