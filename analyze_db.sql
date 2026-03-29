-- ============================================================
-- Step 1: Force PostgreSQL to update table statistics
-- Run this first, then run inspect_db.sql
-- ============================================================

ANALYZE user_profiles;
ANALYZE teachers;
ANALYZE students;
ANALYZE sections;
ANALYZE subjects;
ANALYZE questions;
ANALYZE exam_settings;
ANALYZE exam_attempts;
ANALYZE exam_question_snapshots;
