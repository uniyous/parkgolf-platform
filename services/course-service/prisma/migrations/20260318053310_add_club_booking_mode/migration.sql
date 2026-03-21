-- CreateEnum
CREATE TYPE "BookingMode" AS ENUM ('PLATFORM', 'PARTNER');

-- AlterTable
ALTER TABLE "clubs" ADD COLUMN     "booking_mode" "BookingMode" NOT NULL DEFAULT 'PLATFORM';
