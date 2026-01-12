-- Migration: Remove legacy tables that reference non-existent companies table
-- Date: 2025-01-12
-- Description: Remove time_slot_templates and time_slot_generation_logs tables
--              These tables were created in 20240729000001 but reference companies
--              table which has been moved to iam-service (iam_db)

-- Drop foreign key constraint first
ALTER TABLE IF EXISTS "time_slot_templates"
DROP CONSTRAINT IF EXISTS "time_slot_templates_company_id_fkey";

-- Drop tables
DROP TABLE IF EXISTS "time_slot_generation_logs" CASCADE;
DROP TABLE IF EXISTS "time_slot_templates" CASCADE;

-- Drop enum types that are no longer used
DROP TYPE IF EXISTS "RoundType" CASCADE;
DROP TYPE IF EXISTS "TimeSlotStatus" CASCADE;
