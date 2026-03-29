-- ============================================================
-- NSCT ADMIN SEED SCRIPT
-- Run this in Supabase SQL Editor AFTER:
-- 1. Running the full schema (from MASTER_GUIDE.md §9)
-- 2. Creating admin user in Supabase Authentication dashboard
--    (Auth → Users → Add User)
--    Email: admin@dai-nsct.vercel.app
--    Password: Admin@1234
-- ============================================================

-- Step 1: Get the admin user UUID
-- Go to Authentication → Users → copy the UUID for admin@dai-nsct.vercel.app

-- Step 2: Paste the UUID here and run:
DO $$
DECLARE
  admin_uuid UUID;
BEGIN
  -- Get admin user UUID from auth.users
  SELECT id INTO admin_uuid FROM auth.users WHERE email = 'admin@dai-nsct.vercel.app' LIMIT 1;

  IF admin_uuid IS NULL THEN
    RAISE EXCEPTION 'Admin user not found. Create admin@dai-nsct.vercel.app in Supabase Auth first.';
  END IF;

  -- Insert admin profile
  INSERT INTO user_profiles (id, role, display_name, must_change_password, is_active)
  VALUES (admin_uuid, 'admin', 'System Administrator', true, true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', display_name = 'System Administrator';

  RAISE NOTICE 'Admin profile created for UUID: %', admin_uuid;
END;
$$;

-- ============================================================
-- OPTIONAL: Seed sample data for testing
-- ============================================================

-- Sample subjects with weightages
INSERT INTO subjects (subject_name, description, weightage, is_active) VALUES
  ('Mathematics',     'Algebra, Geometry, Calculus',    30, true),
  ('English',         'Grammar, Comprehension, Writing', 20, true),
  ('General Science', 'Physics, Chemistry, Biology',    25, true),
  ('Pakistan Studies','History, Geography, Civics',      15, true),
  ('Computer Science','IT, Programming fundamentals',   10, true)
ON CONFLICT (subject_name) DO NOTHING;

-- Verify
SELECT 'Subjects created:' as status, COUNT(*) as count FROM subjects;
SELECT 'Exam settings:' as status, total_questions, total_minutes FROM exam_settings;
