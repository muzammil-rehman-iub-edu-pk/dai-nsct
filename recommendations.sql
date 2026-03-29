-- ============================================================
-- NSCT — All Recommendations SQL
-- Run each section independently or all at once.
-- Each section is safe to re-run (uses IF EXISTS / IF NOT EXISTS).
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- REC 1. Drop duplicate snapshot read policy
-- student_own_snapshots (public role) and snapshots_read_own
-- (authenticated role) do the same thing. Keep the cleaner
-- snapshots_read_own and drop the redundant one.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "student_own_snapshots" ON exam_question_snapshots;

-- Verify only one student snapshot read policy remains
SELECT policyname, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'exam_question_snapshots'
ORDER BY policyname;


-- ────────────────────────────────────────────────────────────
-- REC 2. Fix exam_settings.updated_by FK to SET NULL on delete
-- Currently NO ACTION — leaves dangling UUID if admin deleted.
-- ────────────────────────────────────────────────────────────
ALTER TABLE exam_settings
  DROP CONSTRAINT IF EXISTS exam_settings_updated_by_fkey;

ALTER TABLE exam_settings
  ADD CONSTRAINT exam_settings_updated_by_fkey
  FOREIGN KEY (updated_by)
  REFERENCES user_profiles(id)
  ON DELETE SET NULL;

-- Verify
SELECT
  tc.constraint_name,
  rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name = rc.constraint_name
WHERE tc.table_name = 'exam_settings'
  AND tc.constraint_type = 'FOREIGN KEY';


-- ────────────────────────────────────────────────────────────
-- REC 3. Add index on exam_question_snapshots.question_id
-- Needed for per-question analytics queries.
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_snapshots_question
  ON exam_question_snapshots(question_id);


-- ────────────────────────────────────────────────────────────
-- REC 4. Add partial index on questions.is_active
-- Every exam build filters WHERE is_active = true on 4732 rows.
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_questions_active
  ON questions(is_active)
  WHERE is_active = true;


-- ────────────────────────────────────────────────────────────
-- REC 5. Add index on exam_attempts.status
-- Dashboard queries filter by status.
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_attempts_status
  ON exam_attempts(status);


-- ────────────────────────────────────────────────────────────
-- REC 6. Add unique constraint on questions(question_text, subject_id)
-- Prevents exact duplicate questions within the same subject.
-- NOTE: Run the duplicate check query first before adding constraint.
-- If duplicates exist, clean them up first or this will fail.
-- ────────────────────────────────────────────────────────────

-- Step 6a: Check for existing duplicates first
SELECT
  subject_id,
  question_text,
  COUNT(*) AS duplicate_count
FROM questions
GROUP BY subject_id, question_text
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- Step 6b: Only run this if Step 6a returns 0 rows
-- ALTER TABLE questions
--   ADD CONSTRAINT questions_unique_text_per_subject
--   UNIQUE (subject_id, question_text);


-- ────────────────────────────────────────────────────────────
-- REC 7. Restrict questions_read_student policy
-- Currently students can read ALL active questions directly.
-- Tighten it to only allow reads during an active exam attempt.
-- This prevents students from querying the full question bank via API.
-- ────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "questions_read_student" ON questions;

CREATE POLICY "questions_read_student"
  ON questions FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND get_my_role() = 'student'
    AND EXISTS (
      SELECT 1
      FROM exam_attempts ea
      JOIN students s ON s.id = ea.student_id
      WHERE s.user_id = auth.uid()
        AND ea.status = 'in_progress'
    )
  );


-- ────────────────────────────────────────────────────────────
-- REC 8. Add subject_id to exam_question_snapshots
-- Enables per-subject analytics in results/review without
-- needing to join back through questions table.
-- ────────────────────────────────────────────────────────────
ALTER TABLE exam_question_snapshots
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

-- Backfill subject_id for existing snapshots from questions table
UPDATE exam_question_snapshots eqs
SET subject_id = q.subject_id
FROM questions q
WHERE eqs.question_id = q.id
  AND eqs.subject_id IS NULL;

-- Add index for subject-level analytics queries
CREATE INDEX IF NOT EXISTS idx_snapshots_subject
  ON exam_question_snapshots(subject_id);

-- Verify backfill
SELECT
  COUNT(*)                                          AS total_snapshots,
  COUNT(subject_id)                                 AS snapshots_with_subject,
  COUNT(*) - COUNT(subject_id)                      AS snapshots_missing_subject
FROM exam_question_snapshots;


-- ────────────────────────────────────────────────────────────
-- REC 9. Enforce exam_settings singleton (max 1 row)
-- Prevents accidental second row insertion.
-- Uses a unique index on a constant expression.
-- ────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS exam_settings_singleton
  ON exam_settings ((true));


-- ────────────────────────────────────────────────────────────
-- REC 10. Add updated_at column to sections
-- Every other table has updated_at. Sections only has created_at.
-- ────────────────────────────────────────────────────────────
ALTER TABLE sections
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Backfill existing rows with created_at value
UPDATE sections
SET updated_at = created_at
WHERE updated_at IS NULL;


-- ────────────────────────────────────────────────────────────
-- Final verification — confirm all indexes now in place
-- ────────────────────────────────────────────────────────────
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
