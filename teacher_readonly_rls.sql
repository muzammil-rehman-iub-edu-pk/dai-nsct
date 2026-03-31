-- ============================================================
-- teacher_readonly_rls.sql
--
-- Grants teachers read-only SELECT access to ALL records in:
--   teachers, sections, students
--
-- Previously teachers could only see their own row / assigned sections.
-- This update adds a separate read-all policy for teachers while keeping
-- the existing write-restriction policies intact.
--
-- Run in Supabase SQL Editor.
-- ============================================================

-- ─── teachers: allow teachers to SELECT all teacher rows ─────────────────────
-- (existing policy only allows own row)
DROP POLICY IF EXISTS "teachers_read_all_by_teacher" ON teachers;
CREATE POLICY "teachers_read_all_by_teacher"
  ON teachers FOR SELECT
  USING (get_my_role() = 'teacher');

-- ─── sections: allow teachers to SELECT all sections ─────────────────────────
-- (existing policy only allows their assigned sections)
DROP POLICY IF EXISTS "sections_read_all_by_teacher" ON sections;
CREATE POLICY "sections_read_all_by_teacher"
  ON sections FOR SELECT
  USING (get_my_role() = 'teacher');

-- ─── students: allow teachers to SELECT all students ─────────────────────────
-- (existing policy only allows students in their assigned sections)
DROP POLICY IF EXISTS "students_read_all_by_teacher" ON students;
CREATE POLICY "students_read_all_by_teacher"
  ON students FOR SELECT
  USING (get_my_role() = 'teacher');

-- ─── exam_attempts: allow teachers to SELECT all attempts ────────────────────
-- (existing policy only allows attempts from their section students)
DROP POLICY IF EXISTS "attempts_read_all_by_teacher" ON exam_attempts;
CREATE POLICY "attempts_read_all_by_teacher"
  ON exam_attempts FOR SELECT
  USING (get_my_role() = 'teacher');

-- ─── Verify ──────────────────────────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM   pg_policies
WHERE  tablename IN ('teachers', 'sections', 'students', 'exam_attempts')
  AND  policyname LIKE '%teacher%'
ORDER  BY tablename, policyname;
