-- DropForeignKey
ALTER TABLE "refund_tiers" DROP CONSTRAINT "refund_tiers_refund_policy_id_fkey";

-- DropForeignKey
ALTER TABLE "noshow_penalties" DROP CONSTRAINT "noshow_penalties_noshow_policy_id_fkey";

-- DropTable
DROP TABLE "cancellation_policies";

-- DropTable
DROP TABLE "refund_policies";

-- DropTable
DROP TABLE "refund_tiers";

-- DropTable
DROP TABLE "noshow_policies";

-- DropTable
DROP TABLE "noshow_penalties";

-- DropTable
DROP TABLE "user_noshow_records";

-- DropTable
DROP TABLE "operating_policies";

-- DropEnum
DROP TYPE "PolicyScope";

-- DropEnum
DROP TYPE "NoShowPenaltyType";

