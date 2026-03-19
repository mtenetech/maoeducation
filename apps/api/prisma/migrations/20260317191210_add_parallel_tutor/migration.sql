-- AlterTable
ALTER TABLE "parallels" ADD COLUMN     "tutor_id" TEXT;

-- AddForeignKey
ALTER TABLE "parallels" ADD CONSTRAINT "parallels_tutor_id_fkey" FOREIGN KEY ("tutor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
