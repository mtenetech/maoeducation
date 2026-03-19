-- AlterTable
ALTER TABLE "course_assignments" ADD COLUMN IF NOT EXISTS "exam_weight" INTEGER NOT NULL DEFAULT 30;
