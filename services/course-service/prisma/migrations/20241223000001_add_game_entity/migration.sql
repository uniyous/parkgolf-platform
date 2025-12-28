-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "TimeSlotStatus" AS ENUM ('AVAILABLE', 'FULLY_BOOKED', 'CLOSED', 'MAINTENANCE');

-- CreateTable
CREATE TABLE "games" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "front_nine_course_id" INTEGER NOT NULL,
    "back_nine_course_id" INTEGER NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "games_code_key" ON "games"("code");

-- CreateIndex
CREATE INDEX "games_club_id_idx" ON "games"("club_id");

-- CreateIndex
CREATE UNIQUE INDEX "games_front_nine_course_id_back_nine_course_id_key" ON "games"("front_nine_course_id", "back_nine_course_id");

-- CreateIndex
CREATE INDEX "game_time_slots_date_idx" ON "game_time_slots"("date");

-- CreateIndex
CREATE INDEX "game_time_slots_status_idx" ON "game_time_slots"("status");

-- CreateIndex
CREATE UNIQUE INDEX "game_time_slots_game_id_date_start_time_key" ON "game_time_slots"("game_id", "date", "start_time");

-- CreateIndex
CREATE UNIQUE INDEX "game_weekly_schedules_game_id_day_of_week_key" ON "game_weekly_schedules"("game_id", "day_of_week");

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_front_nine_course_id_fkey" FOREIGN KEY ("front_nine_course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_back_nine_course_id_fkey" FOREIGN KEY ("back_nine_course_id") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "games" ADD CONSTRAINT "games_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_time_slots" ADD CONSTRAINT "game_time_slots_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_weekly_schedules" ADD CONSTRAINT "game_weekly_schedules_game_id_fkey" FOREIGN KEY ("game_id") REFERENCES "games"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
