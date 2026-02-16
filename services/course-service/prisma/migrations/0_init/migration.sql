-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TimeSlotStatus" AS ENUM ('AVAILABLE', 'FULLY_BOOKED', 'CLOSED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "CourseStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "ClubStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'SEASONAL_CLOSED');

-- CreateEnum
CREATE TYPE "TeeBoxLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'PROFESSIONAL');

-- CreateEnum
CREATE TYPE "SlotMode" AS ENUM ('TEE_TIME', 'SESSION');

-- CreateEnum
CREATE TYPE "ClubType" AS ENUM ('PAID', 'FREE');

-- CreateTable
CREATE TABLE "clubs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "company_id" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "website" TEXT,
    "total_holes" INTEGER NOT NULL DEFAULT 0,
    "total_courses" INTEGER NOT NULL DEFAULT 0,
    "status" "ClubStatus" NOT NULL DEFAULT 'ACTIVE',
    "operating_hours" JSONB,
    "season_info" JSONB,
    "facilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "club_type" "ClubType" NOT NULL DEFAULT 'PAID',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clubs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "hole_count" INTEGER NOT NULL DEFAULT 9,
    "par" INTEGER NOT NULL DEFAULT 36,
    "total_distance" INTEGER,
    "difficulty" INTEGER NOT NULL DEFAULT 3,
    "scenic_rating" INTEGER NOT NULL DEFAULT 3,
    "course_rating" DOUBLE PRECISION,
    "slope_rating" DOUBLE PRECISION,
    "image_url" TEXT,
    "status" "CourseStatus" NOT NULL DEFAULT 'ACTIVE',
    "club_id" INTEGER NOT NULL,
    "company_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holes" (
    "id" SERIAL NOT NULL,
    "hole_number" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "distance" INTEGER NOT NULL,
    "handicap" INTEGER NOT NULL,
    "description" TEXT,
    "tips" TEXT,
    "image_url" TEXT,
    "course_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "holes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tee_boxes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "distance" INTEGER NOT NULL,
    "difficulty" "TeeBoxLevel" NOT NULL DEFAULT 'INTERMEDIATE',
    "hole_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tee_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "front_nine_course_id" INTEGER NOT NULL,
    "back_nine_course_id" INTEGER NOT NULL,
    "slot_mode" "SlotMode" NOT NULL DEFAULT 'TEE_TIME',
    "total_holes" INTEGER NOT NULL DEFAULT 18,
    "estimated_duration" INTEGER NOT NULL DEFAULT 180,
    "break_duration" INTEGER NOT NULL DEFAULT 10,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "base_price" DECIMAL(10,2) NOT NULL,
    "weekend_price" DECIMAL(10,2),
    "holiday_price" DECIMAL(10,2),
    "club_id" INTEGER NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'ACTIVE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_time_slots" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "max_players" INTEGER NOT NULL DEFAULT 4,
    "booked_players" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2) NOT NULL,
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "status" "TimeSlotStatus" NOT NULL DEFAULT 'AVAILABLE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_weekly_schedules" (
    "id" SERIAL NOT NULL,
    "game_id" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 10,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_weekly_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processed_slot_reservations" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "game_time_slot_id" INTEGER NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "processed_slot_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "clubs_company_id_idx" ON "clubs"("company_id");

-- CreateIndex
CREATE INDEX "clubs_status_idx" ON "clubs"("status");

-- CreateIndex
CREATE INDEX "clubs_is_active_idx" ON "clubs"("is_active");

-- CreateIndex
CREATE INDEX "clubs_latitude_longitude_idx" ON "clubs"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "courses_club_id_idx" ON "courses"("club_id");

-- CreateIndex
CREATE INDEX "courses_company_id_idx" ON "courses"("company_id");

-- CreateIndex
CREATE INDEX "courses_status_idx" ON "courses"("status");

-- CreateIndex
CREATE INDEX "courses_is_active_idx" ON "courses"("is_active");

-- CreateIndex
CREATE INDEX "holes_course_id_idx" ON "holes"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "holes_course_id_hole_number_key" ON "holes"("course_id", "hole_number");

-- CreateIndex
CREATE INDEX "tee_boxes_hole_id_idx" ON "tee_boxes"("hole_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE INDEX "games_club_id_idx" ON "games"("club_id");

-- CreateIndex
CREATE INDEX "games_status_idx" ON "games"("status");

-- CreateIndex
CREATE INDEX "games_is_active_idx" ON "games"("is_active");

-- CreateIndex
CREATE INDEX "games_club_id_status_is_active_idx" ON "games"("club_id", "status", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "games_front_nine_course_id_back_nine_course_id_key" ON "games"("front_nine_course_id", "back_nine_course_id");

-- CreateIndex
CREATE INDEX "game_time_slots_game_id_date_idx" ON "game_time_slots"("game_id", "date");

-- CreateIndex
CREATE INDEX "game_time_slots_game_id_status_idx" ON "game_time_slots"("game_id", "status");

-- CreateIndex
CREATE INDEX "game_time_slots_date_idx" ON "game_time_slots"("date");

-- CreateIndex
CREATE INDEX "game_time_slots_status_idx" ON "game_time_slots"("status");

-- CreateIndex
CREATE INDEX "game_time_slots_is_active_idx" ON "game_time_slots"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "game_time_slots_game_id_date_start_time_key" ON "game_time_slots"("game_id", "date", "start_time");

-- CreateIndex
CREATE INDEX "game_weekly_schedules_game_id_idx" ON "game_weekly_schedules"("game_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_weekly_schedules_game_id_day_of_week_key" ON "game_weekly_schedules"("game_id", "day_of_week");

-- CreateIndex
CREATE INDEX "processed_slot_reservations_expires_at_idx" ON "processed_slot_reservations"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "processed_slot_reservations_booking_id_game_time_slot_id_key" ON "processed_slot_reservations"("booking_id", "game_time_slot_id");

-- AddForeignKey
ALTER TABLE "courses" ADD CONSTRAINT "courses_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holes" ADD CONSTRAINT "holes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tee_boxes" ADD CONSTRAINT "tee_boxes_hole_id_fkey" FOREIGN KEY ("hole_id") REFERENCES "holes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_front_nine_course_id_fkey" FOREIGN KEY ("front_nine_course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_back_nine_course_id_fkey" FOREIGN KEY ("back_nine_course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_time_slots" ADD CONSTRAINT "game_time_slots_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_weekly_schedules" ADD CONSTRAINT "game_weekly_schedules_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE CASCADE ON UPDATE CASCADE;

