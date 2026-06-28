ALTER TYPE "public"."PaymentStatus" ADD VALUE 'PENDING';--> statement-breakpoint
ALTER TYPE "public"."PaymentStatus" ADD VALUE 'FAILED';--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "pg_config_id" integer;