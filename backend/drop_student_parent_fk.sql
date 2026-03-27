-- ============================================================
-- Fix students table FK constraints
-- Run this ONCE in your Supabase SQL editor.
--
-- The students table was set up with two wrong FK constraints:
--   1. students.id → users.id  (children don't have auth accounts)
--   2. students.parent_id → parents.id  (parent_id is auth.users UUID)
-- Both must be dropped so student records can be created normally.
-- ============================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop ALL foreign key constraints on the students table
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'students'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE students DROP CONSTRAINT IF EXISTS %I', r.conname);
    RAISE NOTICE 'Dropped FK constraint: %', r.conname;
  END LOOP;
END $$;

-- Verify no FK constraints remain
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'students'::regclass
  AND contype = 'f';
