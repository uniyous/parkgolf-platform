CREATE TYPE "public"."PgProvider" AS ENUM('TOSS');--> statement-breakpoint
CREATE TYPE "public"."PgScope" AS ENUM('PLATFORM', 'COMPANY', 'CLUB');--> statement-breakpoint
CREATE TABLE "pg_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"scope_level" "PgScope" NOT NULL,
	"company_id" integer,
	"club_id" integer,
	"provider" "PgProvider" NOT NULL,
	"secret_ref" text NOT NULL,
	"base_url" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "pg_configs_scope_key" ON "pg_configs" USING btree ("scope_level","company_id","club_id");