-- CreateTable
CREATE TABLE "pedagogic_recoveries" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_assignment_id" TEXT NOT NULL,
    "academic_period_id" TEXT NOT NULL,
    "score" DECIMAL(5,2),
    "notes" TEXT,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pedagogic_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pedagogic_recoveries_institution_id_academic_period_id_idx" ON "pedagogic_recoveries"("institution_id", "academic_period_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "pedagogic_recoveries_student_id_course_assignment_id_academic_period_id_key" ON "pedagogic_recoveries"("student_id", "course_assignment_id", "academic_period_id");

-- AddForeignKey
ALTER TABLE "pedagogic_recoveries" ADD CONSTRAINT "pedagogic_recoveries_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedagogic_recoveries" ADD CONSTRAINT "pedagogic_recoveries_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedagogic_recoveries" ADD CONSTRAINT "pedagogic_recoveries_course_assignment_id_fkey" FOREIGN KEY ("course_assignment_id") REFERENCES "course_assignments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedagogic_recoveries" ADD CONSTRAINT "pedagogic_recoveries_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pedagogic_recoveries" ADD CONSTRAINT "pedagogic_recoveries_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
