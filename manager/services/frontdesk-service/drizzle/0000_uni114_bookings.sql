CREATE TYPE "public"."BookingChannel" AS ENUM('DESK', 'PHONE', 'WALK_IN', 'KIOSK');--> statement-breakpoint
CREATE TYPE "public"."BookingStatus" AS ENUM('PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED');--> statement-breakpoint
CREATE TYPE "public"."PlayerPaymentStatus" AS ENUM('UNPAID', 'PAID', 'REFUNDED');--> statement-breakpoint
CREATE TABLE "booking_players" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_id" integer NOT NULL,
	"player_no" integer NOT NULL,
	"member_ref" text,
	"charge_amount" integer DEFAULT 0 NOT NULL,
	"checked_in_at" timestamp (3),
	"payment_status" "PlayerPaymentStatus" DEFAULT 'UNPAID' NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"booking_number" text NOT NULL,
	"club_id" integer NOT NULL,
	"company_id" integer,
	"game_time_slot_id" integer NOT NULL,
	"channel" "BookingChannel" NOT NULL,
	"player_count" integer NOT NULL,
	"staff_id" integer,
	"kiosk_id" text,
	"status" "BookingStatus" DEFAULT 'PENDING' NOT NULL,
	"total_price" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp (3) DEFAULT now() NOT NULL,
	"updated_at" timestamp (3) DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "booking_players_booking_player_key" ON "booking_players" USING btree ("booking_id","player_no");--> statement-breakpoint
CREATE INDEX "booking_players_booking_idx" ON "booking_players" USING btree ("booking_id");--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_booking_number_key" ON "bookings" USING btree ("booking_number");--> statement-breakpoint
CREATE INDEX "bookings_club_idx" ON "bookings" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "bookings_slot_idx" ON "bookings" USING btree ("game_time_slot_id");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");