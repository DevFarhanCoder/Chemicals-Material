-- Remove unique constraint from case_no column
-- This allows the same CAS number to exist with different units/quantities
ALTER TABLE "materials" DROP CONSTRAINT IF EXISTS "materials_case_no_key";
