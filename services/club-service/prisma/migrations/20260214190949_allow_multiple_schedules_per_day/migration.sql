-- DropIndex
DROP INDEX IF EXISTS "game_weekly_schedules_game_id_day_of_week_key";

-- CreateIndex
CREATE UNIQUE INDEX "game_weekly_schedules_game_id_day_of_week_start_time_key" ON "game_weekly_schedules"("game_id", "day_of_week", "start_time");
