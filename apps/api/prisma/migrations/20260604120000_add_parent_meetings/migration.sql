-- CreateTable
CREATE TABLE "parent_meetings" (
    "id" TEXT NOT NULL,
    "institution_id" TEXT NOT NULL,
    "student_id" TEXT,
    "recorded_by" TEXT NOT NULL,
    "meeting_date" DATE NOT NULL,
    "meeting_time" VARCHAR(8),
    "visitor_name" VARCHAR(160) NOT NULL,
    "visitor_relation" VARCHAR(80),
    "subject" VARCHAR(200) NOT NULL,
    "details" TEXT NOT NULL,
    "agreements" TEXT,
    "signature_key" VARCHAR(255),
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parent_meetings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "parent_meetings_institution_id_meeting_date_idx" ON "parent_meetings"("institution_id", "meeting_date");

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "institutions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parent_meetings" ADD CONSTRAINT "parent_meetings_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
