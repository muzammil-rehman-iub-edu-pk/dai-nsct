# DAI-NSCT — Database Reference

> Knowledge base for developers and AI agents.
> Last updated: 2026-04-02 (rev 4)
> Database: Supabase PostgreSQL (free tier)

---

## 1. Extensions

| Extension | Version | Schema | Purpose |
|---|---|---|---|
| uuid-ossp | 1.1 | extensions | `uuid_generate_v4()` for all primary keys |
| pgcrypto | 1.3 | extensions | Password hashing (used by Supabase Auth internally) |
| plpgsql | 1.0 | pg_catalog | Procedural language for trigger functions |
| pg_graphql | 1.5.11 | graphql | Auto-generated GraphQL API (not used by app) |
| pg_stat_statements | 1.11 | extensions | Query performance tracking (platform) |
| supabase_vault | 0.3.1 | vault | Secrets management (not used by app) |

---

## 2. Tables

### user_profiles
Extends Supabase `auth.users`. One row per authenticated user.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | — | PK, FK → auth.users(id) CASCADE |
| role | TEXT | NO | — | CHECK: admin, teacher, student |
| display_name | TEXT | NO | — | Full name |
| is_active | BOOLEAN | YES | true | Account enabled/disabled |
| must_change_password | BOOLEAN | YES | true | Force password change on first login |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | |

---

### teachers

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| user_id | UUID | YES | — | FK → user_profiles(id) SET NULL, UNIQUE |
| teacher_name | TEXT | NO | — | |
| designation | TEXT | YES | — | e.g. "Lecturer" |
| expertise | TEXT | YES | — | Subject area |
| email | TEXT | NO | — | UNIQUE |
| is_active | BOOLEAN | YES | true | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | |

---

### sections

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| section_name | TEXT | NO | — | UNIQUE |
| teacher_id | UUID | YES | — | FK → teachers(id) SET NULL |
| is_active | BOOLEAN | YES | true | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | Added via recommendations.sql |

---

### students

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| user_id | UUID | YES | — | FK → user_profiles(id) SET NULL, UNIQUE |
| reg_number | TEXT | NO | — | UNIQUE, alphanumeric 3–30 chars |
| student_name | TEXT | NO | — | |
| father_name | TEXT | NO | — | |
| section_id | UUID | NO | — | FK → sections(id) RESTRICT |
| email | TEXT | NO | — | UNIQUE |
| is_active | BOOLEAN | YES | true | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | |

---

### subjects

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| subject_name | TEXT | NO | — | UNIQUE |
| description | TEXT | YES | — | |
| weightage | NUMERIC(5,2) | NO | 10.00 | CHECK: > 0 AND <= 100 |
| is_active | BOOLEAN | YES | true | |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | |

---

### questions
The MCQ data bank. `option_a` is always the correct answer.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| subject_id | UUID | NO | — | FK → subjects(id) CASCADE |
| question_text | TEXT | NO | — | |
| option_a | TEXT | NO | — | Always the correct answer |
| option_b | TEXT | YES | — | Wrong answer |
| option_c | TEXT | YES | — | Wrong answer |
| option_d | TEXT | YES | — | Wrong answer |
| option_e | TEXT | YES | — | Wrong answer (5th option, rare) |
| is_active | BOOLEAN | YES | true | |
| created_by | UUID | YES | — | FK → user_profiles(id) SET NULL |
| created_at | TIMESTAMPTZ | YES | now() | |
| updated_at | TIMESTAMPTZ | YES | now() | |

---

### exam_settings
Singleton table — always exactly 1 row.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| total_questions | INT | NO | 100 | Number of questions per exam |
| total_minutes | INT | NO | 100 | Exam duration in minutes |
| show_results_to_students | BOOLEAN | NO | false | Controls ExamReview access |
| updated_by | UUID | YES | — | FK → user_profiles(id) SET NULL |
| updated_at | TIMESTAMPTZ | YES | now() | |

Current live values: total_questions=100, total_minutes=100, show_results_to_students=true

---

### exam_attempts
One row per exam attempt per student.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| student_id | UUID | NO | — | FK → students(id) CASCADE |
| started_at | TIMESTAMPTZ | YES | now() | |
| submitted_at | TIMESTAMPTZ | YES | — | Null until submitted |
| time_taken_secs | INT | YES | — | Actual time taken |
| total_questions | INT | NO | — | Snapshot of question count at time of exam |
| correct_answers | INT | YES | 0 | |
| score_percent | NUMERIC(5,2) | YES | 0 | |
| status | TEXT | YES | 'in_progress' | CHECK: in_progress, completed, timed_out |
| created_at | TIMESTAMPTZ | YES | now() | |

---

### exam_question_snapshots
Tamper-proof per-attempt question record. One row per question per attempt.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| attempt_id | UUID | NO | — | FK → exam_attempts(id) CASCADE |
| question_id | UUID | NO | — | FK → questions(id) CASCADE |
| question_text | TEXT | NO | — | Snapshot at time of exam |
| options | JSONB | NO | — | `[{label, text, is_correct}]` shuffled |
| selected_label | TEXT | YES | — | Student's answer: A/B/C/D/E or null |
| is_correct | BOOLEAN | YES | — | Null until submitted |
| question_order | INT | NO | — | Display order for this student |
| subject_id | UUID | YES | — | FK → subjects(id) SET NULL (added via recommendations.sql) |

---

### shared_reports
Password-protected public report links. One row per shared attempt (idempotent — re-sharing same attempt returns same row).

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | UUID | NO | uuid_generate_v4() | PK |
| attempt_id | UUID | NO | — | FK → exam_attempts(id) CASCADE, UNIQUE |
| token | TEXT | NO | — | UNIQUE, UUID-based URL token (no dashes) |
| password_hash | TEXT | NO | — | Reserved for future bcrypt hashing |
| password_plain | TEXT | NO | — | 16-char generated password (shown to student once, stored for verification) |
| created_at | TIMESTAMPTZ | YES | now() | |
| expires_at | TIMESTAMPTZ | YES | NULL | NULL = never expires |

RLS policies on shared_reports:
- `shared_reports_student_own` — authenticated students can INSERT/SELECT their own attempt's reports
- `shared_reports_admin` — admin full access
- `shared_reports_public_read` — anon role can SELECT by token (for password gate page)
- `shared_reports_teacher` — teachers can INSERT/SELECT/UPDATE/DELETE reports for attempts belonging to their section students

---

## 3. Live Data (as of 2026-03-29)

| Table | Rows |
|---|---|
| user_profiles | 5 (1 admin + 3 teachers + 1 student) |
| teachers | 3 |
| students | 1 |
| sections | 2 |
| subjects | 11 |
| questions | 4,732 (all active) |
| exam_settings | 1 |
| exam_attempts | 2 (both completed) |
| exam_question_snapshots | 181 (81 + 100) |

---

## 4. Subjects (Live)

| Subject | UUID | Questions | Weightage |
|---|---|---|---|
| Database Systems | ef9d65f3-726a-488a-af86-4074b784d357 | 1,962 | 41.45% |
| Computer Networks | 6b8be341-7fa6-4791-9d7d-68df5909f7ed | 507 | 10.71% |
| AI / ML / Data Analytics | 846bb4e7-894e-4946-9074-e7534ddae770 | 500 | 10.57% |
| Problem Solving & Analytical Skills | 8cb3a76b-984d-429c-bcdc-701aac209302 | 499 | 10.55% |
| Web Development | 3814bdcb-f731-4586-a054-389ff2db0171 | 290 | 6.13% |
| Cyber Security | 68a019e3-f379-486a-a5e5-7faa17e409ea | 271 | 5.73% |
| Software Engineering | 26c87516-2f56-4456-96a0-7ca9133556e8 | 200 | 4.23% |
| Java Programming | 3c061ec0-14e7-4707-8b41-aaa185b2ab95 | 163 | 3.44% |
| Data Structures & Algorithms | dfc76923-0226-4165-ae7e-39f6a4f6885d | 146 | 3.09% |
| Operating System | 0f341f67-5412-4f52-86d9-1326290e6a44 | 97 | 2.05% |
| Python Programming | 8599b5b4-bd41-47c8-b16d-408b8d83ab5b | 97 | 2.05% |

---

## 5. Foreign Key Relationships & Cascade Behavior

| From | Column | To | On Delete |
|---|---|---|---|
| exam_attempts | student_id | students.id | CASCADE |
| exam_question_snapshots | attempt_id | exam_attempts.id | CASCADE |
| exam_question_snapshots | question_id | questions.id | CASCADE |
| exam_question_snapshots | subject_id | subjects.id | SET NULL |
| exam_settings | updated_by | user_profiles.id | SET NULL |
| questions | created_by | user_profiles.id | SET NULL |
| questions | subject_id | subjects.id | CASCADE |
| sections | teacher_id | teachers.id | SET NULL |
| students | section_id | sections.id | RESTRICT |
| students | user_id | user_profiles.id | SET NULL |
| teachers | user_id | user_profiles.id | SET NULL |

Cascade chains:
- Delete student → deletes exam_attempts → deletes exam_question_snapshots
- Delete subject → deletes questions → deletes exam_question_snapshots
- Cannot delete section if students are assigned (RESTRICT)

---

## 6. Indexes

| Table | Index | Type | Purpose |
|---|---|---|---|
| questions | idx_questions_subject | btree | Exam build — filter by subject |
| questions | idx_questions_active | partial (is_active=true) | Exam build — active questions only |
| exam_attempts | idx_exam_attempts_student | btree | Student attempt history |
| exam_attempts | idx_attempts_status | btree | Dashboard status filters |
| exam_question_snapshots | idx_snapshots_attempt | btree | Load exam questions |
| exam_question_snapshots | idx_snapshots_question | btree | Per-question analytics |
| exam_question_snapshots | idx_snapshots_subject | btree | Per-subject analytics |
| students | idx_students_section | btree | Teacher section view |
| sections | idx_sections_teacher | btree | Teacher section lookup |

---

## 7. Check Constraints

| Table | Constraint | Rule |
|---|---|---|
| user_profiles | user_profiles_role_check | role IN ('admin', 'teacher', 'student') |
| exam_attempts | exam_attempts_status_check | status IN ('in_progress', 'completed', 'timed_out') |
| subjects | subjects_weightage_check | weightage > 0 AND weightage <= 100 |
| exam_settings | exam_settings_singleton | UNIQUE INDEX on (true) — max 1 row |

---

## 8. Unique Constraints

| Table | Column(s) | Notes |
|---|---|---|
| sections | section_name | No duplicate section names |
| students | email | |
| students | reg_number | |
| students | user_id | One auth account per student |
| subjects | subject_name | No duplicate subject names |
| teachers | email | |
| teachers | user_id | One auth account per teacher |

---

## 9. SECURITY DEFINER Functions

All 5 functions are STABLE, SQL language, `SET search_path TO 'public'` (injection-safe).
They bypass RLS entirely — used inside RLS policies to avoid infinite recursion.

| Function | Returns | Logic |
|---|---|---|
| `get_my_role()` | TEXT | `SELECT role FROM user_profiles WHERE id = auth.uid()` |
| `get_my_teacher_id()` | UUID | `SELECT id FROM teachers WHERE user_id = auth.uid()` |
| `get_my_student_id()` | UUID | `SELECT id FROM students WHERE user_id = auth.uid()` |
| `get_my_section_id()` | UUID | `SELECT section_id FROM students WHERE user_id = auth.uid()` |
| `get_my_teacher_section_ids()` | SETOF UUID | `SELECT s.id FROM sections s JOIN teachers t ON s.teacher_id = t.id WHERE t.user_id = auth.uid()` |

---

## 10. Row Level Security Policies

RLS enabled on all 9 tables. `rls_forced = false` — service_role key bypasses RLS (used by Edge Functions).

### user_profiles (5 policies)
| Policy | CMD | Rule |
|---|---|---|
| profile_select | SELECT | `id = auth.uid() OR get_my_role() = 'admin'` |
| profile_insert_admin | INSERT | `get_my_role() = 'admin'` |
| profile_update_own | UPDATE | `id = auth.uid()` (USING + WITH CHECK) |
| profile_update_admin | UPDATE | `get_my_role() = 'admin'` |
| profile_delete_admin | DELETE | `get_my_role() = 'admin'` |

### teachers (5 policies)
| Policy | CMD | Rule |
|---|---|---|
| teachers_select | SELECT | `get_my_role() = 'admin' OR user_id = auth.uid()` |
| teachers_read_all_by_teacher | SELECT | `get_my_role() = 'teacher'` — read-only view of all teachers |
| teachers_insert_admin | INSERT | `get_my_role() = 'admin'` |
| teachers_update_admin | UPDATE | `get_my_role() = 'admin'` |
| teachers_delete_admin | DELETE | `get_my_role() = 'admin'` |

### sections (5 policies)
| Policy | CMD | Rule |
|---|---|---|
| sections_select | SELECT | `get_my_role() = 'admin' OR id IN (get_my_teacher_section_ids()) OR id = get_my_section_id()` |
| sections_read_all_by_teacher | SELECT | `get_my_role() = 'teacher'` — read-only view of all sections |
| sections_insert_admin | INSERT | `get_my_role() = 'admin'` |
| sections_update_admin | UPDATE | `get_my_role() = 'admin'` |
| sections_delete_admin | DELETE | `get_my_role() = 'admin'` |

### students (6 policies)
| Policy | CMD | Rule |
|---|---|---|
| students_select | SELECT | `get_my_role() = 'admin' OR section_id IN (get_my_teacher_section_ids()) OR user_id = auth.uid()` |
| students_read_all_by_teacher | SELECT | `get_my_role() = 'teacher'` — read-only view of all students |
| students_insert_admin | INSERT | `get_my_role() = 'admin'` |
| students_update_admin | UPDATE | `get_my_role() = 'admin'` |
| students_update_own | UPDATE | `user_id = auth.uid()` (USING + WITH CHECK) |
| students_delete_admin | DELETE | `get_my_role() = 'admin'` |

### subjects (2 policies)
| Policy | CMD | Rule |
|---|---|---|
| subjects_all_admin | ALL | `get_my_role() = 'admin'` |
| subjects_read_active | SELECT | `is_active = true AND get_my_role() IN ('teacher', 'student')` |

### questions (3 policies)
| Policy | CMD | Rule |
|---|---|---|
| questions_all_admin | ALL | `get_my_role() = 'admin'` |
| questions_all_teacher | ALL | `get_my_role() = 'teacher'` |
| questions_read_student | SELECT | `is_active = true AND get_my_role() = 'student'` |

### exam_settings (2 policies)
| Policy | CMD | Rule |
|---|---|---|
| admin_manage_settings | ALL | `get_my_role() = 'admin'` |
| others_read_settings | SELECT | `get_my_role() IN ('teacher', 'student')` |

### exam_attempts (4 policies)
| Policy | CMD | Rule |
|---|---|---|
| admin_all_attempts | ALL | `get_my_role() = 'admin'` |
| student_own_attempts | ALL | `student_id = get_my_student_id()` |
| teacher_section_attempts | SELECT | `student_id IN (students in teacher's sections) OR get_my_role() = 'admin'` |
| attempts_read_all_by_teacher | SELECT | `get_my_role() = 'teacher'` — read-only view of all attempts |

### exam_question_snapshots (3 policies)
| Policy | CMD | Rule |
|---|---|---|
| admin_all_snapshots | ALL | `get_my_role() = 'admin'` |
| snapshots_read_own | SELECT | `attempt_id IN (attempts where student.user_id = auth.uid())` |
| teacher_snapshots | SELECT | `attempt_id IN (attempts for teacher's section students) OR get_my_role() = 'admin'` |

---

## 11. Migration History

Applied in this order:

1. Base schema (MASTER_GUIDE.md §9) — all tables, original RLS, helper functions
2. `fix_rls_recursion.sql` — replaced all policies with SECURITY DEFINER functions to fix 42P17 infinite recursion
3. `fix_questions_subjects_rls.sql` — updated subjects/questions policies to use SECURITY DEFINER `get_my_role()`
4. `add_show_results_setting.sql` — added `show_results_to_students` to exam_settings + fixed snapshots student read policy
5. `replace_subjects.sql` — replaced sample subjects with 11 real NSCT subjects
6. `insert_questions.sql` — inserted 4,732 questions across all 11 subjects
7. `recommendations.sql` — applied DB improvements (indexes, constraints, schema fixes)
8. `feature_shared_reports.sql` — added `shared_reports` table for password-protected public exam report URLs
9. `teacher_readonly_rls.sql` — added read-all SELECT policies for teachers on teachers, sections, students, exam_attempts tables
10. `teacher_shared_reports_rls.sql` — added ALL policy for teachers on shared_reports for their section students' attempts
