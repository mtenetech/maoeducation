-- CreateTable
CREATE TABLE "qualitative_areas" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qualitative_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qualitative_grades" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "academic_period_id" TEXT NOT NULL,
    "area_id" TEXT NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "recorded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "qualitative_grades_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "qualitative_grades_student_id_academic_period_id_area_id_key" ON "qualitative_grades"("student_id", "academic_period_id", "area_id");

-- AddForeignKey
ALTER TABLE "qualitative_areas" ADD CONSTRAINT "qualitative_areas_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualitative_grades" ADD CONSTRAINT "qualitative_grades_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualitative_grades" ADD CONSTRAINT "qualitative_grades_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualitative_grades" ADD CONSTRAINT "qualitative_grades_academic_period_id_fkey" FOREIGN KEY ("academic_period_id") REFERENCES "academic_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualitative_grades" ADD CONSTRAINT "qualitative_grades_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "qualitative_areas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qualitative_grades" ADD CONSTRAINT "qualitative_grades_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
