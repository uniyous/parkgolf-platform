-- DropIndex (기존 인덱스 제거)
DROP INDEX IF EXISTS "bookings_time_slot_id_idx";
DROP INDEX IF EXISTS "bookings_single_course_id_idx";
DROP INDEX IF EXISTS "bookings_slot_type_idx";

-- Drop existing tables if needed (조심스럽게 - 데이터 백업 필요)
DROP TABLE IF EXISTS "time_slot_availability" CASCADE;
DROP TABLE IF EXISTS "course_cache" CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS "slot_type" CASCADE;

-- Modify bookings table: Add new columns
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "game_time_slot_id" INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "game_id" INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "game_name" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "game_code" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "club_id" INTEGER;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "club_name" TEXT;

-- Drop old columns (if they exist)
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "time_slot_id";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "slot_type";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "single_course_id";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "single_course_name";
ALTER TABLE "bookings" DROP COLUMN IF EXISTS "break_duration_minutes";

-- Set NOT NULL for new required fields (after data migration if needed)
-- ALTER TABLE "bookings" ALTER COLUMN "game_time_slot_id" SET NOT NULL;
-- ALTER TABLE "bookings" ALTER COLUMN "game_id" SET NOT NULL;

-- CreateTable: GameCache
CREATE TABLE "game_cache" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "front_nine_course_id" INTEGER NOT NULL,
    "front_nine_course_name" TEXT NOT NULL,
    "back_nine_course_id" INTEGER NOT NULL,
    "back_nine_course_name" TEXT NOT NULL,
    "total_holes" INTEGER NOT NULL DEFAULT 18,
    "estimated_duration" INTEGER NOT NULL DEFAULT 180,
    "break_duration" INTEGER NOT NULL DEFAULT 10,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "base_price" DECIMAL(10,2) NOT NULL,
    "weekend_price" DECIMAL(10,2),
    "holiday_price" DECIMAL(10,2),
    "club_id" INTEGER NOT NULL,
    "club_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable: GameTimeSlotCache
CREATE TABLE "game_time_slot_cache" (
    "id" SERIAL NOT NULL,
    "game_time_slot_id" INTEGER NOT NULL,
    "game_id" INTEGER NOT NULL,
    "game_name" TEXT,
    "game_code" TEXT,
    "front_nine_course_name" TEXT,
    "back_nine_course_name" TEXT,
    "club_id" INTEGER,
    "club_name" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "booked_players" INTEGER NOT NULL DEFAULT 0,
    "available_players" INTEGER NOT NULL DEFAULT 4,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "price" DECIMAL(10,2) NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "last_sync_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_time_slot_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_cache_game_id_key" ON "game_cache"("game_id");
CREATE INDEX "game_cache_club_id_idx" ON "game_cache"("club_id");

CREATE UNIQUE INDEX "game_time_slot_cache_game_time_slot_id_key" ON "game_time_slot_cache"("game_time_slot_id");
CREATE INDEX "game_time_slot_cache_game_id_idx" ON "game_time_slot_cache"("game_id");
CREATE INDEX "game_time_slot_cache_club_id_idx" ON "game_time_slot_cache"("club_id");
CREATE INDEX "game_time_slot_cache_date_idx" ON "game_time_slot_cache"("date");
CREATE INDEX "game_time_slot_cache_date_start_time_idx" ON "game_time_slot_cache"("date", "start_time");
CREATE INDEX "game_time_slot_cache_is_available_idx" ON "game_time_slot_cache"("is_available");
CREATE INDEX "game_time_slot_cache_status_idx" ON "game_time_slot_cache"("status");

-- CreateIndex for bookings
CREATE INDEX IF NOT EXISTS "bookings_game_time_slot_id_idx" ON "bookings"("game_time_slot_id");
CREATE INDEX IF NOT EXISTS "bookings_game_id_idx" ON "bookings"("game_id");
CREATE INDEX IF NOT EXISTS "bookings_club_id_idx" ON "bookings"("club_id");
