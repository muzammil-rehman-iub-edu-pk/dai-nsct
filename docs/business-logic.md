
# NSCT — Business Logic Reference

> Knowledge base for developers and AI agents.
> Last updated: 2026-03-29

---

## 1. Purpose & Scope

NSCT (National Skills Competency Test) is a standardized online MCQ examination platform for assessing student competency across multiple technical subjects.

**Scope:**
- Admin manages all users, content, and configuration
- Teachers monitor student performance within their assigned sections
- Students take randomized exams and optionally review results
- All exam content is drawn from a centralized question data bank
- Each exam attempt is unique per student (randomized questions + options)

---

## 2. User Roles & Permissions

### Admin
- Full access to everything
- Creates and manages teachers, students, sections, subjects
- Manages the question data bank (add, edit, delete, bulk upload)
- Configures exam settings (total questions, time limit, show results toggle)
- Views all performance data across all sections and students
- Cannot self-register — first admin created manually via Supabase dashboard + seed.sql

### Teacher
- Created by admin only
- Can view their assigned sections and the students within them
- Can view all exam attempts and scores for students in their sections
- Can add, edit, and delete questions in the data bank
- Cannot manage users, sections, subjects, or exam settings
- Cannot see students outside their assigned sections

### Student
- Created by admin only
- Belongs to exactly one section (cannot be moved without admin action)
- Can take unlimited exam attempts
- Can view their own attempt history and scores
- Can review exam answers only if `show_results_to_students = true`
- Cannot see other students' data
- Cannot access questions directly (only via exam snapshots)

---

## 3. Authentication Rules

| Rule | Detail |
|---|---|
| Self-registration | Not allowed — admin creates all users |
| Email confirmation | Disabled — admin-created accounts are immediately active |
| First login | All new users must change password before accessing any page |
| Password requirements | Min 8 chars, 1 uppercase, 1 number |
| Account deactivation | Admin can set `is_active = false` — user sees "Account Disabled" screen and cannot proceed |
| Role mismatch | If user navigates to wrong role URL, redirected to their correct home |
| Session persistence | JWT stored in localStorage, auto-refreshed by Supabase SDK |
| Force password change | `must_change_password = true` blocks all pages until changed — modal cannot be dismissed |

---

## 4. Exam Configuration

Managed by admin in Settings page. Stored as a singleton row in `exam_settings`.

| Setting | Default | Range | Effect |
|---|---|---|---|
| total_questions | 100 | 1–500 | Number of questions per exam attempt |
| total_minutes | 100 | 1–300 | Exam duration countdown |
| show_results_to_students | false | boolean | Controls access to ExamReview page |

Current live values: 100 questions, 100 minutes, show_results = true.

---

## 5. Question Data Bank Rules

- Questions belong to exactly one subject
- `option_a` is always the correct answer in the database (DB contract)
- Options are shuffled at exam render time — students never see option_a as always correct
- Questions can have 2–5 options (option_b through option_e are nullable)
- Questions can be toggled active/inactive without deletion
- Only active questions are included in exam builds
- Deleting a subject cascades to delete all its questions and all related snapshots
- Teachers can add/edit/delete questions (same DataBank page as admin)
- Bulk upload format: first line = question, remaining lines = options, prefix correct with `correct:`, blank line separates questions

### Bulk Upload Parser Rules
- `correct:` prefix is case-insensitive
- If no `correct:` prefix found, first option is assumed correct (backward compatible)
- `correct:` prefix is stripped before storing
- Correct answer is rotated to `option_a` position before DB insert
- Inserted in chunks of 100 to avoid Supabase request size limits
- Minimum 2 options required per question

---

## 6. Exam Generation Logic

### Pre-conditions (checked on ExamLanding)
- At least 1 active subject must exist
- Total active questions across all active subjects must be >= `total_questions` setting
- If pre-conditions fail, start button is disabled with explanation

### Step 1: Weighted Allocation (`buildWeightedExam`)
1. Filter subjects to only those with `is_active = true` AND have at least 1 active question
2. Calculate total weight of available subjects
3. Allocate questions proportionally: `allocated = round((weightage / totalWeight) * totalNeeded)`
4. Fix rounding drift: difference applied to the largest subject
5. First pass: shuffle each subject's question pool, take up to `allocated` per subject, track shortage
6. Second pass: fill shortage from subjects that have spare questions beyond their allocation
7. Final shuffle of all selected questions

### Step 2: Snapshot Preparation (`prepareQuestion`)
For each selected question:
1. Build options array from `option_a` (correct) + `option_b–e` (wrong), filter out null/empty
2. Fisher-Yates shuffle the options array
3. Assign labels A, B, C, D, E to shuffled positions
4. Return snapshot object: `{ question_id, question_text, options: [{label, text, is_correct}], question_order, selected_label: null, is_correct: null }`

### Step 3: DB Insert
1. Insert `exam_attempts` row with `status = 'in_progress'`
2. Insert all `exam_question_snapshots` rows (one per question)
3. Navigate to ExamRoom with `{ attemptId, settings }` in location.state

---

## 7. Exam Room Rules

| Rule | Detail |
|---|---|
| Entry | Must have `attemptId` in location.state — otherwise redirect to `/student` |
| Questions source | Loaded from `exam_question_snapshots` ordered by `question_order` |
| Answer recording | Debounced 800ms auto-save to DB on each answer selection |
| Navigation | Free navigation — student can go back and change answers at any time |
| Timer | Counts down from `total_minutes * 60` seconds |
| Timer warning | Urgent pulse animation when < 300 seconds (5 minutes) remaining |
| Auto-submit | Triggered when timer reaches 0 — status set to `timed_out` |
| Manual submit | Student clicks Submit — status set to `completed` |
| Double submit | Prevented by `submitting` flag check |

### Submit Flow
1. Stop timer
2. Calculate `timeTaken = (Date.now() - startTime) / 1000`
3. For each snapshot: determine `selected_label` (from answers state) and `is_correct` (check options JSONB for matching label with `is_correct: true`)
4. Batch update all snapshots with `selected_label` + `is_correct`
5. `calculateScore`: count correct, compute `percent = round((correct/total) * 10000) / 100`
6. Update `exam_attempts`: status, submitted_at, time_taken_secs, correct_answers, score_percent
7. Show inline results screen (no page navigation)

### Scoring
- `correct_answers` = count of snapshots where `is_correct = true`
- `score_percent` = `(correct_answers / total_questions) * 100` rounded to 2 decimal places
- Unanswered questions count as wrong (is_correct = false, selected_label = null)

---

## 8. Grade Thresholds

| Score | Grade | Display |
|---|---|---|
| >= 80% | Excellent | Green |
| >= 65% | Good | Green |
| >= 50% | Pass | Accent (blue/teal) |
| < 50% | Fail | Red |

---

## 9. Exam Review Rules

- Only accessible if `show_results_to_students = true` in exam_settings
- If false: redirect to `/student` immediately
- Student can only review their own attempts (RLS enforced)
- Shows all questions with:
  - Correct answer always highlighted green
  - Student's wrong answer highlighted red
  - Unanswered questions show correct answer in outlined green
- Summary: correct count, wrong count, skipped count

---

## 10. Section Management Rules

- A section can exist without a teacher (teacher_id is nullable)
- A section cannot be deleted if students are assigned to it (RESTRICT FK)
- A student belongs to exactly one section — section_id is NOT NULL
- Teacher sees only sections assigned to them
- Student sees only their own section

---

## 11. Subject & Weightage Rules

- Subject names must be unique
- Weightage must be > 0 and <= 100
- Weightages do not need to sum to 100 — the exam engine normalizes them proportionally
- Deactivating a subject excludes it from exam builds (but keeps its questions)
- Deleting a subject cascades to delete all questions and all related snapshots — destructive, use with caution

---

## 12. Data Integrity Rules

| Rule | Enforcement |
|---|---|
| One auth account per teacher | UNIQUE on teachers.user_id |
| One auth account per student | UNIQUE on students.user_id |
| Unique email per teacher | UNIQUE on teachers.email |
| Unique email per student | UNIQUE on students.email |
| Unique reg number per student | UNIQUE on students.reg_number |
| Unique section name | UNIQUE on sections.section_name |
| Unique subject name | UNIQUE on subjects.subject_name |
| Valid role values | CHECK constraint on user_profiles.role |
| Valid attempt status | CHECK constraint on exam_attempts.status |
| Valid weightage range | CHECK constraint on subjects.weightage |
| Singleton exam_settings | UNIQUE INDEX on (true) — max 1 row |
| Correct answer always option_a | Application-level contract enforced by DataBank form + bulk parser |

---

## 13. Restrictions & Checks

### What admin CANNOT do
- Delete a section that has students assigned (DB RESTRICT)
- Set weightage to 0 or negative (DB CHECK)
- Set role to anything other than admin/teacher/student (DB CHECK)
- Set attempt status to anything other than in_progress/completed/timed_out (DB CHECK)

### What teacher CANNOT do
- See students outside their assigned sections (RLS)
- Manage users, sections, subjects, or exam settings (RLS)
- See exam snapshots for students outside their sections (RLS)

### What student CANNOT do
- See other students' data (RLS)
- Access questions table directly (only via snapshots, and only during active exam)
- Access ExamReview if show_results_to_students = false
- Dismiss the force-password-change modal (required=true, no close button)
- Submit an exam twice (submitting flag + status check)

### What nobody can do without admin role
- Insert into user_profiles (profile_insert_admin policy)
- Insert into teachers (teachers_insert_admin policy)
- Insert into students (students_insert_admin policy)
- Insert into sections (sections_insert_admin policy)
- Modify exam_settings (admin_manage_settings policy)

---

## 14. Cascade & Deletion Consequences

| Action | Consequence |
|---|---|
| Delete student | All their exam_attempts deleted → all their exam_question_snapshots deleted |
| Delete subject | All questions in that subject deleted → all snapshots referencing those questions deleted |
| Delete teacher | sections.teacher_id set to NULL (section stays, unassigned) |
| Delete user_profile | teachers.user_id or students.user_id set to NULL (record stays, unlinked) |
| Delete section | BLOCKED if students are assigned |
| Deactivate question | Excluded from future exams, existing snapshots unaffected |
| Deactivate subject | Excluded from future exams, existing questions and snapshots unaffected |
| Deactivate user | User sees "Account Disabled" screen, cannot log in or proceed |

---

## 15. Exam Attempt Lifecycle

```
[Student clicks Start Exam]
        ↓
[ExamLanding validates: active subjects exist, enough questions]
        ↓
[buildWeightedExam → prepareQuestion × N]
        ↓
[INSERT exam_attempts (status: in_progress)]
[INSERT exam_question_snapshots × N]
        ↓
[Navigate to ExamRoom]
        ↓
[Student answers questions — debounced auto-save]
        ↓
[Timer expires OR student clicks Submit]
        ↓
[UPDATE snapshots: selected_label, is_correct]
[UPDATE exam_attempts: status, submitted_at, time_taken_secs, correct_answers, score_percent]
        ↓
[Show results screen]
        ↓
[If show_results_to_students=true → Review button available]
```

---

## 16. Performance Considerations

| Concern | Mitigation |
|---|---|
| 4,732 questions in exam build | Partial index on is_active, index on subject_id |
| Bulk snapshot insert (100 questions) | Chunked in batches of 100 |
| Rapid answer clicks during exam | 800ms debounce on auto-save |
| Large tables in admin views | Pagination at 50 rows per page |
| Initial page load | All pages lazy-loaded via React.lazy |
| Supabase free tier pausing | UptimeRobot ping every 10 minutes |
