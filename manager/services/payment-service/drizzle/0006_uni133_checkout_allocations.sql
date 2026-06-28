CREATE TYPE "public"."CheckoutAllocationStatus" AS ENUM('ACTIVE', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "checkout_allocations" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"booking_id" integer NOT NULL,
	"booking_player_id" integer NOT NULL,
	"amount" integer NOT NULL,
	"status" "CheckoutAllocationStatus" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "payments_booking_id_key";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "idempotency_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_alloc_player_active_key" ON "checkout_allocations" USING btree ("booking_player_id") WHERE "checkout_allocations"."status" = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "checkout_alloc_payment_idx" ON "checkout_allocations" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "checkout_alloc_booking_idx" ON "checkout_allocations" USING btree ("booking_id");--> statement-breakpoint
CREATE INDEX "payments_booking_idx" ON "payments" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payments_idempotency_key_key" ON "payments" USING btree ("idempotency_key");