-- CreateTable
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "course_assignment_id" TEXT NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "due_date" TIMESTAMP(3) NOT NULL,
  "publish_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tasks_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tasks_course_assignment_id_fkey" FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "tasks_institution_id_course_assignment_id_idx" ON "tasks"("institution_id", "course_assignment_id");
CREATE INDEX IF NOT EXISTS "tasks_institution_id_due_date_idx" ON "tasks"("institution_id", "due_date");
