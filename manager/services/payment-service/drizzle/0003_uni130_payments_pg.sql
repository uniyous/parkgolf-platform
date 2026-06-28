ALTER TABLE "payments" ADD COLUMN "provider" "PgProvider";--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_key" text;--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "pg_raw" jsonb;--> statement-breakpoint
CREATE UNIQUE INDEX "payments_payment_key_key" ON "payments" USING btree ("payment_key");