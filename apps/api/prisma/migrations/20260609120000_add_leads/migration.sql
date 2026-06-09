-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(50),
    "institution_name" VARCHAR(200),
    "city" VARCHAR(100),
    "role" VARCHAR(80),
    "students_count" INTEGER,
    "message" TEXT,
    "source" VARCHAR(50) NOT NULL DEFAULT 'landing',
    "status" VARCHAR(30) NOT NULL DEFAULT 'new',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "leads"("status", "created_at");
