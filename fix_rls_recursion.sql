-- ============================================================
-- fix_rls_recursion.sql
-- Run this in Supabase SQL Editor to fix the 42P17 infinite
-- recursion error on sections / teachers / students / user_profiles
--
-- ROOT CAUSE:
--   The original policies used inline subqueries that joined
--   tables which themselves had RLS policies — creating circular
--   evaluation chains:
--     sections policy → checks teachers table
--     teachers table  → has its own RLS → checks user_profiles
--     user_profiles   → has its own RLS → ... infinite loop
--
-- FIX:
--   Replace all inline subqueries in policies with SECURITY DEFINER
--   functions. These functions run as the DB owner (bypassing RLS),
--   so they can query any table directly without triggering policies.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. Drop all existing policies on affected tables
-- ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_all_sections"          ON sections;
DROP POLICY IF EXISTS "teacher_sees_sections"       ON sections;
DROP POLICY IF EXISTS "student_sees_section"        ON sections;

DROP POLICY IF EXISTS "admin_all_teachers"          ON teachers;
DROP POLICY IF EXISTS "teacher_own"                 ON teachers;

DROP POLICY IF EXISTS "admin_all_students"          ON students;
DROP POLICY IF EXISTS "teacher_section_students"    ON students;
DROP POLICY IF EXISTS "student_own"                 ON students;

DROP POLICY IF EXISTS "own_profile"                 ON user_profiles;
DROP POLICY IF EXISTS "admin_manage_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "user_update_own_profile"     ON user_profiles;

-- Also drop any partial fixes applied previously
DROP POLICY IF EXISTS "profile_select"              ON user_profiles;
DROP POLICY IF EXISTS "profile_insert_admin"        ON user_profiles;
DROP POLICY IF EXISTS "profile_update_own"          ON user_profiles;
DROP POLICY IF EXISTS "profile_update_admin"        ON user_profiles;
DROP POLICY IF EXISTS "profile_delete_admin"        ON user_profiles;
DROP POLICY IF EXISTS "teachers_select"             ON teachers;
DROP POLICY IF EXISTS "teachers_insert_admin"       ON teachers;
DROP POLICY IF EXISTS "teachers_update_admin"       ON teachers;
DROP POLICY IF EXISTS "teachers_delete_admin"       ON teachers;
DROP POLICY IF EXISTS "sections_select"             ON sections;
DROP POLICY IF EXISTS "sections_insert_admin"       ON sections;
DROP POLICY IF EXISTS "sections_update_admin"       ON sections;
DROP POLICY IF EXISTS "sections_delete_admin"       ON sections;
DROP POLICY IF EXISTS "students_select"             ON students;
DROP POLICY IF EXISTS "students_insert_admin"       ON students;
DROP POLICY IF EXISTS "students_update_admin"       ON students;
DROP POLICY IF EXISTS "students_update_own"         ON students;
DROP POLICY IF EXISTS "students_delete_admin"       ON students;

-- ─────────────────────────────────────────────────────────────
-- 2. SECURITY DEFINER helper functions
--    Run as DB owner — bypass RLS entirely — no recursion possible
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_teacher_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_student_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM students WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_section_id()
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT section_id FROM students WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION get_my_teacher_section_ids()
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM   sections s
  JOIN   teachers t ON s.teacher_id = t.id
  WHERE  t.user_id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. user_profiles policies
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "profile_select"
  ON user_profiles FOR SELECT
  USING (id = auth.uid() OR get_my_role() = 'admin');

CREATE POLICY "profile_insert_admin"
  ON user_profiles FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

-- Users can update their own row (e.g. must_change_password flag)
CREATE POLICY "profile_update_own"
  ON user_profiles FOR UPDATE
  USING    (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins can update any row
CREATE POLICY "profile_update_admin"
  ON user_profiles FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "profile_delete_admin"
  ON user_profiles FOR DELETE
  USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 4. teachers policies
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "teachers_select"
  ON teachers FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR user_id = auth.uid()
  );

CREATE POLICY "teachers_insert_admin"
  ON teachers FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "teachers_update_admin"
  ON teachers FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "teachers_delete_admin"
  ON teachers FOR DELETE
  USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 5. sections policies
--    Uses get_my_teacher_section_ids() and get_my_section_id()
--    so there is NO direct reference to the teachers table here
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "sections_select"
  ON sections FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR id IN (SELECT get_my_teacher_section_ids())
    OR id = get_my_section_id()
  );

CREATE POLICY "sections_insert_admin"
  ON sections FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "sections_update_admin"
  ON sections FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "sections_delete_admin"
  ON sections FOR DELETE
  USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 6. students policies
-- ─────────────────────────────────────────────────────────────
CREATE POLICY "students_select"
  ON students FOR SELECT
  USING (
    get_my_role() = 'admin'
    OR section_id IN (SELECT get_my_teacher_section_ids())
    OR user_id = auth.uid()
  );

CREATE POLICY "students_insert_admin"
  ON students FOR INSERT
  WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "students_update_admin"
  ON students FOR UPDATE
  USING (get_my_role() = 'admin');

CREATE POLICY "students_update_own"
  ON students FOR UPDATE
  USING    (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "students_delete_admin"
  ON students FOR DELETE
  USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- Verify
-- ─────────────────────────────────────────────────────────────
SELECT schemaname, tablename, policyname
FROM   pg_policies
WHERE  tablename IN ('user_profiles','teachers','sections','students')
ORDER  BY tablename, policyname;
