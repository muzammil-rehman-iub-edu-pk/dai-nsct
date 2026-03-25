-- ============================================================
-- fix_questions_subjects_rls.sql
--
-- ROOT CAUSE:
--   The original schema created RLS policies for `questions`
--   and `subjects` using the plain get_my_role() function
--   (not SECURITY DEFINER). After fix_rls_recursion.sql was
--   applied, a new SECURITY DEFINER version of get_my_role()
--   was created — but the questions/subjects policies were
--   never updated to use it.
--
--   Result: get_my_role() returns NULL for the admin when
--   evaluating questions policies, so the SELECT returns 0
--   rows for most subjects on the Subjects page.
--
-- FIX:
--   Drop and recreate policies for `questions` and `subjects`
--   using the SECURITY DEFINER get_my_role() already in place.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Drop existing policies on subjects and questions
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_subjects"           ON subjects;
DROP POLICY IF EXISTS "others_read_active_subjects"  ON subjects;

DROP POLICY IF EXISTS "admin_all_questions"          ON questions;
DROP POLICY IF EXISTS "teacher_manage_questions"     ON questions;
DROP POLICY IF EXISTS "student_no_questions"         ON questions;

-- ─────────────────────────────────────────────────────────────
-- 2. subjects policies
-- ─────────────────────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "subjects_all_admin"
  ON subjects FOR ALL
  USING (get_my_role() = 'admin');

-- Teachers and students: read active subjects only
CREATE POLICY "subjects_read_active"
  ON subjects FOR SELECT
  USING (is_active = true AND get_my_role() IN ('teacher', 'student'));

-- ─────────────────────────────────────────────────────────────
-- 3. questions policies
-- ─────────────────────────────────────────────────────────────

-- Admin: full access
CREATE POLICY "questions_all_admin"
  ON questions FOR ALL
  USING (get_my_role() = 'admin');

-- Teachers: full access (add / edit / delete questions)
CREATE POLICY "questions_all_teacher"
  ON questions FOR ALL
  USING (get_my_role() = 'teacher');

-- Students: no direct access to questions table
-- (they only see snapshots via exam_question_snapshots)

-- ─────────────────────────────────────────────────────────────
-- 4. Verify
-- ─────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd, qual
FROM   pg_policies
WHERE  tablename IN ('subjects', 'questions')
ORDER  BY tablename, policyname;
