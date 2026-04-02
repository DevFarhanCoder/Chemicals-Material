-- Add parent_id column to materials for sub-row (parent-child) support
ALTER TABLE "materials" ADD COLUMN "parent_id" TEXT;

-- Add foreign key constraint with CASCADE delete (deleting parent removes its sub-rows)
ALTER TABLE "materials" ADD CONSTRAINT "materials_parent_id_fkey"
  FOREIGN KEY ("parent_id") REFERENCES "materials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Index for fast lookup of sub-rows by parent
CREATE INDEX "materials_parent_id_idx" ON "materials"("parent_id");
