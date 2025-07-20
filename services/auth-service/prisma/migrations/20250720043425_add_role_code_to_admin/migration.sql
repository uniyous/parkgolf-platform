-- AlterTable
ALTER TABLE "admins" ADD COLUMN     "roleCode" TEXT;

-- AddForeignKey
ALTER TABLE "admins" ADD CONSTRAINT "admins_roleCode_fkey" FOREIGN KEY ("roleCode") REFERENCES "role_masters"("code") ON DELETE SET NULL ON UPDATE CASCADE;
