-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN     "deletion_scheduled_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "user_histories" (
    "id" SERIAL NOT NULL,
    "original_user_id" INTEGER NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "phone" TEXT,
    "deletion_reason" TEXT,
    "deleted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_histories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_histories_original_user_id_key" ON "user_histories"("original_user_id");

-- CreateIndex
CREATE INDEX "user_histories_original_user_id_idx" ON "user_histories"("original_user_id");

-- CreateIndex
CREATE INDEX "user_histories_email_idx" ON "user_histories"("email");
