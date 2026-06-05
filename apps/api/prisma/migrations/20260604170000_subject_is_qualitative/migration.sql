-- Reemplazo del enfoque: las áreas cualitativas pasan a ser materias con flag.
-- DropTable (las tablas de áreas cualitativas ya no se usan)
DROP TABLE IF EXISTS "qualitative_grades";
DROP TABLE IF EXISTS "qualitative_areas";

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN "is_qualitative" BOOLEAN NOT NULL DEFAULT false;
