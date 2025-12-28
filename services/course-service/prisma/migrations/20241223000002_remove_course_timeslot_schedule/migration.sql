-- Migration: Remove CourseTimeSlot and CourseWeeklySchedule
-- Date: 2024-12-23
-- Description: Remove unused Course-based time slot and weekly schedule tables
--              as we now use Game-based scheduling (GameTimeSlot, GameWeeklySchedule)

-- Drop foreign key constraints first
ALTER TABLE "course_time_slots" DROP CONSTRAINT IF EXISTS "course_time_slots_course_id_fkey";
ALTER TABLE "course_weekly_schedules" DROP CONSTRAINT IF EXISTS "course_weekly_schedules_course_id_fkey";

-- Drop indexes
DROP INDEX IF EXISTS "course_time_slots_course_id_date_start_time_end_time_key";
DROP INDEX IF EXISTS "course_weekly_schedules_course_id_day_of_week_key";

-- Drop tables
DROP TABLE IF EXISTS "course_time_slots" CASCADE;
DROP TABLE IF EXISTS "course_weekly_schedules" CASCADE;
