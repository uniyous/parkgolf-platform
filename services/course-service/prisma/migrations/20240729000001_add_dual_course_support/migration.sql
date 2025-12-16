-- CreateEnum (9홀 기준으로 수정)
CREATE TYPE "RoundType" AS ENUM ('NINE_HOLE', 'EIGHTEEN_HOLE');

-- CreateEnum  
CREATE TYPE "TimeSlotStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BOOKED_OUT', 'CANCELLED');

-- Step 1: Add new columns with default values (9홀 기준 2개 코스만)
ALTER TABLE "course_time_slots" 
ADD COLUMN "round_type" "RoundType" NOT NULL DEFAULT 'EIGHTEEN_HOLE',
ADD COLUMN "first_course_id" INTEGER,
ADD COLUMN "second_course_id" INTEGER,
ADD COLUMN "booked_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "available_slots" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN "nine_hole_price" DECIMAL(10,2),
ADD COLUMN "eighteen_hole_price" DECIMAL(10,2),
ADD COLUMN "status" "TimeSlotStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "notes" TEXT;

-- Step 2: Migrate existing data (9홀 기준)
UPDATE "course_time_slots" 
SET 
  "first_course_id" = "courseId",
  "available_slots" = "maxPlayers",
  "eighteen_hole_price" = "price"
WHERE "first_course_id" IS NULL;

-- Step 3: Add constraints after data migration
ALTER TABLE "course_time_slots" 
ALTER COLUMN "first_course_id" SET NOT NULL,
ALTER COLUMN "eighteen_hole_price" SET NOT NULL;

-- Step 4: Drop old unique constraint and add new one
ALTER TABLE "course_time_slots" 
DROP CONSTRAINT "course_time_slots_courseId_date_startTime_endTime_key";

-- Step 5: Add new unique constraint (9홀 2코스 기준)
ALTER TABLE "course_time_slots" 
ADD CONSTRAINT "course_time_slots_first_second_date_startTime_endTime_key" 
UNIQUE("first_course_id", "second_course_id", "date", "startTime", "endTime");

-- Step 6: Add foreign key constraints (9홀 2코스)
ALTER TABLE "course_time_slots" 
ADD CONSTRAINT "course_time_slots_first_course_id_fkey" 
FOREIGN KEY ("first_course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "course_time_slots" 
ADD CONSTRAINT "course_time_slots_second_course_id_fkey" 
FOREIGN KEY ("second_course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Create indexes for performance (9홀 기준)
CREATE INDEX "course_time_slots_date_first_course_id_idx" ON "course_time_slots"("date", "first_course_id");
CREATE INDEX "course_time_slots_round_type_status_idx" ON "course_time_slots"("round_type", "status");

-- Step 8: Create new utility tables (9홀 기준 2코스만)
CREATE TABLE "time_slot_templates" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "round_type" "RoundType" NOT NULL DEFAULT 'EIGHTEEN_HOLE',
    "time_pattern" JSONB NOT NULL,
    "default_max_players" INTEGER NOT NULL DEFAULT 4,
    "default_nine_hole_price" DECIMAL(10,2) NOT NULL,
    "default_eighteen_hole_price" DECIMAL(10,2) NOT NULL,
    "company_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "time_slot_templates_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "time_slot_generation_logs" (
    "id" SERIAL NOT NULL,
    "admin_id" INTEGER,
    "template_id" INTEGER,
    "generation_config" JSONB NOT NULL,
    "slots_created" INTEGER NOT NULL,
    "date_range" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "time_slot_generation_logs_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for new tables
ALTER TABLE "time_slot_templates" 
ADD CONSTRAINT "time_slot_templates_company_id_fkey" 
FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 9: Drop old courseId column (this should be done in a separate migration after ensuring everything works)
-- ALTER TABLE "course_time_slots" DROP COLUMN "courseId";