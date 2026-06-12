-- AlterTable: link an activity back to its source task (1:1)
ALTER TABLE "activities" ADD COLUMN "task_id" TEXT;

-- AlterTable: delivery status per grade (entregado | no_realizado | atrasado | excusado)
ALTER TABLE "grades" ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'entregado';

-- CreateIndex
CREATE UNIQUE INDEX "activities_task_id_key" ON "activities"("task_id");

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;
