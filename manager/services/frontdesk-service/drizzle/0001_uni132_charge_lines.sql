CREATE TYPE "public"."ChargeLineType" AS ENUM('BASE', 'DISCOUNT', 'SURCHARGE');--> statement-breakpoint
CREATE TABLE "booking_charge_lines" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"type" "ChargeLineType" NOT NULL,
	"label" text NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"unit_amount" integer NOT NULL,
	"amount" integer NOT NULL,
	"source" text,
	"source_ref" integer,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "booking_charge_lines_booking_idx" ON "booking_charge_lines" USING btree ("booking_id");