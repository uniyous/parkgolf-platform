-- Add indexes to Game table for search optimization
CREATE INDEX IF NOT EXISTS "games_status_idx" ON "games"("status");
CREATE INDEX IF NOT EXISTS "games_is_active_idx" ON "games"("is_active");
CREATE INDEX IF NOT EXISTS "games_club_id_status_is_active_idx" ON "games"("club_id", "status", "is_active");
