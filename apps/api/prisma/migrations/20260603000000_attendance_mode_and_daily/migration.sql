-- DropForeignKey
ALTER TABLE "attendance_records" DROP CONSTRAINT "attendance_records_course_assignment_id_fkey";

-- AlterTable
ALTER TABLE "levels" ADD COLUMN     "attendance_mode" VARCHAR(20) NOT NULL DEFAULT 'per_subject';

-- AlterTable
ALTER TABLE "attendance_records" ADD COLUMN     "parallel_id" TEXT,
ALTER COLUMN "course_assignment_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "attendance_records_parallel_id_date_idx" ON "attendance_records"("parallel_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_parallel_id_student_id_date_key" ON "attendance_records"("parallel_id", "student_id", "date");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_course_assignment_id_fkey" FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_parallel_id_fkey" FOREIGN KEY ("parallel_id") REFERENCES "parallels"("id") ON DELETE SET NULL ON UPDATE CASCADE;
