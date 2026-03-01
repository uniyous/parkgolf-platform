-- CreateEnum
CREATE TYPE "SplitStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "RefundRequestorType" AS ENUM ('USER', 'ADMIN', 'SYSTEM');

-- CreateTable
CREATE TABLE "payment_splits" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER,
    "booking_group_id" INTEGER,
    "booking_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_name" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "SplitStatus" NOT NULL DEFAULT 'PENDING',
    "order_id" TEXT NOT NULL,
    "paid_at" TIMESTAMP(3),
    "expired_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_splits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_splits_order_id_key" ON "payment_splits"("order_id");

-- CreateIndex
CREATE INDEX "payment_splits_booking_group_id_status_idx" ON "payment_splits"("booking_group_id", "status");

-- CreateIndex
CREATE INDEX "payment_splits_booking_id_idx" ON "payment_splits"("booking_id");

-- CreateIndex
CREATE INDEX "payment_splits_user_id_status_idx" ON "payment_splits"("user_id", "status");

-- AddForeignKey
ALTER TABLE "payment_splits" ADD CONSTRAINT "payment_splits_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterColumn: Fix refunds onDelete to match schema (CASCADE)
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_payment_id_fkey";
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
