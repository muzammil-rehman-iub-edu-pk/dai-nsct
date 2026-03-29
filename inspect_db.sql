-- ============================================================
-- NSCT — Database Inspection Script (v2)
-- Run each query block independently in Supabase SQL Editor
-- by selecting it and clicking Run, OR run all at once.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 1. TABLES — accurate row counts via COUNT(*) per table
-- ────────────────────────────────────────────────────────────
SELECT tbl AS table_name, rows AS live_rows FROM (
  SELECT 'user_profiles'            AS tbl, COUNT(*)::bigint AS rows FROM user_profiles
  UNION ALL SELECT 'teachers',               COUNT(*) FROM teachers
  UNION ALL SELECT 'students',               COUNT(*) FROM students
  UNION ALL SELECT 'sections',               COUNT(*) FROM sections
  UNION ALL SELECT 'subjects',               COUNT(*) FROM subjects
  UNION ALL SELECT 'questions',              COUNT(*) FROM questions
  UNION ALL SELECT 'exam_settings',          COUNT(*) FROM exam_settings
  UNION ALL SELECT 'exam_attempts',          COUNT(*) FROM exam_attempts
  UNION ALL SELECT 'exam_question_snapshots',COUNT(*) FROM exam_question_snapshots
) t
ORDER BY tbl;


-- ────────────────────────────────────────────────────────────
-- 2. COLUMNS — all columns per table
-- ────────────────────────────────────────────────────────────
SELECT
  table_name,
  ordinal_position  AS pos,
  column_name,
  data_type,
  udt_name,
  character_maximum_length  AS max_len,
  numeric_precision,
  numeric_scale,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;


-- ────────────────────────────────────────────────────────────
-- 3. PRIMARY KEYS
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.ordinal_position;


-- ────────────────────────────────────────────────────────────
-- 4. FOREIGN KEYS
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name        AS from_table,
  kcu.column_name      AS from_column,
  ccu.table_name       AS to_table,
  ccu.column_name      AS to_column,
  rc.delete_rule       AS on_delete,
  rc.update_rule       AS on_update,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON tc.constraint_name  = rc.constraint_name
 AND tc.table_schema     = rc.constraint_schema
JOIN information_schema.constraint_column_usage ccu
  ON rc.unique_constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema    = 'public'
ORDER BY from_table, from_column;


-- ────────────────────────────────────────────────────────────
-- 5. UNIQUE CONSTRAINTS
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  kcu.column_name,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
 AND tc.table_schema    = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, kcu.column_name;


-- ────────────────────────────────────────────────────────────
-- 6. CHECK CONSTRAINTS
-- ────────────────────────────────────────────────────────────
SELECT
  tc.table_name,
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
 AND tc.table_schema    = cc.constraint_schema
WHERE tc.constraint_type = 'CHECK'
  AND tc.table_schema    = 'public'
ORDER BY tc.table_name, tc.constraint_name;


-- ────────────────────────────────────────────────────────────
-- 7. INDEXES
-- ────────────────────────────────────────────────────────────
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ────────────────────────────────────────────────────────────
-- 8. RLS STATUS per table
-- ────────────────────────────────────────────────────────────
SELECT
  relname              AS table_name,
  relrowsecurity       AS rls_enabled,
  relforcerowsecurity  AS rls_forced
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;


-- ────────────────────────────────────────────────────────────
-- 9. RLS POLICIES — full detail
-- ────────────────────────────────────────────────────────────
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual        AS using_expr,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;


-- ────────────────────────────────────────────────────────────
-- 10. FUNCTIONS — full source + metadata
-- ────────────────────────────────────────────────────────────
SELECT
  p.proname                                  AS function_name,
  pg_get_function_identity_arguments(p.oid)  AS arguments,
  t.typname                                  AS return_type,
  p.prosecdef                                AS security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'immutable'
    WHEN 's' THEN 'stable'
    WHEN 'v' THEN 'volatile'
  END                                        AS volatility,
  l.lanname                                  AS language,
  pg_get_functiondef(p.oid)                  AS source
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_type t      ON t.oid = p.prorettype
JOIN pg_language l  ON l.oid = p.prolang
WHERE n.nspname = 'public'
ORDER BY p.proname;


-- ────────────────────────────────────────────────────────────
-- 11. TRIGGERS
-- ────────────────────────────────────────────────────────────
SELECT
  trigger_name,
  event_object_table  AS table_name,
  event_manipulation  AS event,
  action_timing       AS timing,
  action_orientation  AS orientation,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;


-- ────────────────────────────────────────────────────────────
-- 12. VIEWS
-- ────────────────────────────────────────────────────────────
SELECT
  table_name       AS view_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;


-- ────────────────────────────────────────────────────────────
-- 13. EXTENSIONS
-- ────────────────────────────────────────────────────────────
SELECT
  extname    AS extension,
  extversion AS version,
  n.nspname  AS schema
FROM pg_extension e
JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY extname;


-- ────────────────────────────────────────────────────────────
-- 14. EXAM SETTINGS — live values
-- ────────────────────────────────────────────────────────────
SELECT * FROM exam_settings;


-- ────────────────────────────────────────────────────────────
-- 15. SUBJECTS — with accurate question counts
-- ────────────────────────────────────────────────────────────
SELECT
  s.id,
  s.subject_name,
  s.weightage,
  s.is_active,
  COUNT(q.id)                                        AS total_questions,
  COUNT(q.id) FILTER (WHERE q.is_active = true)      AS active_questions,
  s.created_at
FROM subjects s
LEFT JOIN questions q ON q.subject_id = s.id
GROUP BY s.id, s.subject_name, s.weightage, s.is_active, s.created_at
ORDER BY s.weightage DESC;


-- ────────────────────────────────────────────────────────────
-- 16. SUMMARY COUNTS — accurate via COUNT(*) per table
-- ────────────────────────────────────────────────────────────
SELECT tbl, rows FROM (
  SELECT 'user_profiles'           AS tbl, COUNT(*)::int AS rows FROM user_profiles
  UNION ALL
  SELECT 'teachers',                        COUNT(*)     FROM teachers
  UNION ALL
  SELECT 'students',                        COUNT(*)     FROM students
  UNION ALL
  SELECT 'sections',                        COUNT(*)     FROM sections
  UNION ALL
  SELECT 'subjects',                        COUNT(*)     FROM subjects
  UNION ALL
  SELECT 'questions (total)',               COUNT(*)     FROM questions
  UNION ALL
  SELECT 'questions (active)',              COUNT(*)     FROM questions WHERE is_active = true
  UNION ALL
  SELECT 'exam_attempts',                   COUNT(*)     FROM exam_attempts
  UNION ALL
  SELECT 'exam_attempts (completed)',       COUNT(*)     FROM exam_attempts WHERE status = 'completed'
  UNION ALL
  SELECT 'exam_attempts (timed_out)',       COUNT(*)     FROM exam_attempts WHERE status = 'timed_out'
  UNION ALL
  SELECT 'exam_attempts (in_progress)',     COUNT(*)     FROM exam_attempts WHERE status = 'in_progress'
  UNION ALL
  SELECT 'exam_question_snapshots',         COUNT(*)     FROM exam_question_snapshots
  UNION ALL
  SELECT 'exam_settings',                   COUNT(*)     FROM exam_settings
) counts
ORDER BY tbl;
