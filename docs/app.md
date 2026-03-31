# DAI-NSCT — Application Reference

> Knowledge base for developers and AI agents.
> Last updated: 2026-04-01 (rev 3)

---

## 1. Routing

All routes are defined in `src/App.jsx`. Pages are lazy-loaded via `React.lazy` + `Suspense`.

| Path | Component | Role Required | Notes |
|---|---|---|---|
| `/login` | Login | None | |
| `/` | AuthRedirect | Any | Redirects to role home |
| `/admin` | AdminDashboard | admin | |
| `/admin/teachers` | AdminTeachers | admin | |
| `/admin/students` | AdminStudents | admin | |
| `/admin/sections` | AdminSections | admin | |
| `/admin/subjects` | AdminSubjects | admin | |
| `/admin/databank` | AdminDataBank | admin | |
| `/admin/users/passwords` | AdminUserPasswords | admin | |
| `/admin/settings` | AdminSettings | admin | |
| `/teacher` | TeacherDashboard | teacher | |
| `/teacher/sections` | TeacherSectionProgress | teacher | Assigned sections only |
| `/teacher/databank` | AdminDataBank (shared) | teacher | Full question access |
| `/teacher/stats` | AdminDashboard (shared) | teacher | Read-only stats view |
| `/teachers/view` | AdminTeachers (isReadOnly) | teacher only | RequireTeacher guard |
| `/students/view` | AdminStudents (isReadOnly) | teacher only | RequireTeacher guard |
| `/sections/view` | AdminSections (isReadOnly) | teacher only | RequireTeacher guard |
| `/subjects/view` | AdminSubjects (isReadOnly) | teacher only | RequireTeacher guard |
| `/student` | StudentDashboard | student | |
| `/student/exam` | ExamLanding | student | |
| `/student/exam/room` | ExamRoom | student | |
| `/student/exam/review/:attemptId` | ExamReview | student | |
| `/report/:token` | SharedReport | None | Public, no auth required |
| `*` | Redirect to `/` | Any | |

---

## 2. Auth Guards

### RequireAuth
Every standard protected route is wrapped in `<RequireAuth role="...">`.

Checks in order:
1. If loading → show LoadingScreen
2. If no user or no profile → redirect to `/login`
3. If `profile.is_active === false` → show "Account Disabled" screen
4. If role mismatch → redirect to `/${profile.role}` (correct home)
5. If `profile.must_change_password === true` → show PasswordChangeModal (required, cannot dismiss)
6. Otherwise → render children

### RequireTeacher
Used exclusively for the `/*/view` read-only routes. Enforces teacher role and automatically injects `isReadOnly={true}` into the wrapped component via `React.cloneElement`.

- Non-teacher hitting these routes → redirected to their role home
- Inactive accounts → redirected to `/login`
- Force password change → shows PasswordChangeModal before access

The `/report/:token` route is outside all guards — fully public.

---

## 3. AuthContext (`src/contexts/AuthContext.jsx`)

Global auth state provider. Wraps entire app.

State:
- `user` — Supabase auth user object
- `profile` — row from `user_profiles` table
- `loading` — boolean, true during initial session check

Methods:
- `signIn(email, password)` — calls Supabase auth, triggers profile load
- `signOut()` — clears session
- `refreshProfile()` — re-fetches profile from DB
- `completePasswordChange(newPassword)` — updates auth password + sets `must_change_password=false` + patches in-memory profile + navigates to role home

---

## 4. Pages

### Login (`src/pages/Login.jsx`)
- DAI-NSCT logo + title + description
- Email + password form with show/hide toggle
- Hint text: "Hint: Use your roll_number@iub.edu.pk as email."
- Footer with credits on all pages

### Admin Dashboard (`src/pages/admin/Dashboard.jsx`)
- Stats cards: total teachers, students, sections, subjects, questions, attempts
- "Performance by Teacher" table: sections, students, attempts, avg score; sections sorted by `compareSectionNames`
- "Top Students" table: ranked by avg score; ties broken by `compareRegNumbers`
- Also accessible to teachers at `/teacher/stats` (read-only, same component)

### Admin Teachers (`src/pages/admin/Teachers.jsx`)
- Accepts `isReadOnly` prop — hides Add/Bulk Upload/Edit/Delete/Toggle when true
- Search: name, email, designation
- Filter: status (all/active/inactive)
- Sort: name, designation, email, status (clickable column headers with direction indicator)
- Bulk upload via CSV: `teacher_name, designation, expertise, email, password`
- Creates user via Edge Function `create-user` through `adminApi.createTeacherUser()`

### Admin Students (`src/pages/admin/Students.jsx`)
- Accepts `isReadOnly` prop — hides Add/Bulk Upload/Edit/Delete/Toggle when true
- Search: name, reg#, father name
- Filter: section dropdown, status (all/active/inactive)
- Sort: reg# (default, uses `compareRegNumbers`), name, father name, section, status
- Section dropdown sorted by `compareSectionNames`
- Bulk upload via CSV: `reg_number, student_name, father_name, section_name, email, password`
- `section_name` in CSV resolved to section_id via case-insensitive lookup

### Admin Sections (`src/pages/admin/Sections.jsx`)
- Accepts `isReadOnly` prop — hides Add/Edit/Delete/Toggle when true
- Card grid view; each card shows: section name, assigned teacher, student strength count, status
- Search: section name, teacher name
- Filter: teacher dropdown, status
- Sort buttons: Name (uses `compareSectionNames`), Teacher, Students (by count), Status
- Default sort: section name via `compareSectionNames`

### Admin Subjects (`src/pages/admin/Subjects.jsx`)
- Accepts `isReadOnly` prop — hides Add/Edit/Delete/Toggle when true
- Search: subject name, description
- Filter: status
- Sort: name, weightage, questions count, status (clickable column headers)

### Admin DataBank (`src/pages/admin/DataBank.jsx`)
- Table: question_text, subject, option count, status, actions
- Pagination: 50 per page
- Filter: subject dropdown, status
- Add/Edit modal with dynamic option rows (2–5), correct answer pill toggle
- Bulk upload: file or paste text, `correct:` prefix format
- Shared between admin and teacher roles (teachers have full question access via RLS)

### Admin User Passwords (`src/pages/admin/UserPasswords.jsx`)
- Lists all users with name, email, role, status
- Search by name or email; filter by role
- "Change Password" modal with live validation checklist
- Calls `setUserPassword()` from adminApi → `admin-set-password` Edge Function
- Clears `must_change_password` flag on success

### Admin Settings (`src/pages/admin/Settings.jsx`)
- Exam config: total_questions (1–500), total_minutes (1–300)
- Toggle: show_results_to_students
- Change password button (optional mode)

### Teacher Dashboard (`src/pages/teacher/Dashboard.jsx`)
- Stats: my sections, total students, total attempts, avg score
- Sections overview sorted by `compareSectionNames`
- Students within each section sorted by `compareRegNumbers`

### Teacher Section Progress (`src/pages/teacher/SectionProgress.jsx`)
- Section selector tabs sorted by `compareSectionNames`; default selects first section in sorted order
- Students within each section sorted by `compareRegNumbers`
- Each student row: expandable attempts table + "Password" button (if user_id exists)
- Password change modal: teacher scope enforced server-side (own sections only)

### Teacher Read-Only Views
All four pages reuse admin components with `isReadOnly={true}` injected by `RequireTeacher`:
- `/teachers/view` — all teachers (read-only)
- `/students/view` — all students (read-only)
- `/sections/view` — all sections (read-only)
- `/subjects/view` — all subjects (read-only)

RLS grants teachers SELECT on all records in these tables (via `teacher_readonly_rls.sql`).

### Student Dashboard (`src/pages/student/Dashboard.jsx`)
- Stats: total attempts, average score, best score
- Attempts history (collapsible): score, correct/total, status, Review button, Share Report button

### Exam Landing (`src/pages/student/ExamLanding.jsx`)
- Subject distribution preview, exam rules
- Validates: active subjects exist + enough questions
- Builds exam via `buildWeightedExam` + `prepareQuestion`, inserts snapshots, navigates to ExamRoom

### Exam Room (`src/pages/student/ExamRoom.jsx`)
- Sticky header: progress bar, timer, submit button
- Free navigation, debounced 800ms auto-save
- Auto-submits on timer expiry (status: timed_out)
- Inline results screen after submit

### Exam Review (`src/pages/student/ExamReview.jsx`)
- Only accessible if `show_results_to_students = true`
- Shows all questions with correct (green) / wrong (red) / skipped indicators
- Correct answer from snapshot `is_correct` field — reflects randomized order, not DB `option_a`

### Shared Report (`src/pages/SharedReport.jsx`)
- Route: `/report/:token` — fully public
- Password gate → loads attempt + snapshots on correct password
- Full question review with correct/wrong/skipped indicators

---

## 5. Sidebar Navigation

### Admin (8 links)
1. Dashboard — `/admin`
2. Teachers — `/admin/teachers`
3. Students — `/admin/students`
4. Sections — `/admin/sections`
5. Subjects — `/admin/subjects`
6. Data Bank — `/admin/databank`
7. User Passwords — `/admin/users/passwords`
8. Settings — `/admin/settings`

### Teacher (8 links)
1. Dashboard — `/teacher`
2. Statistics — `/teacher/stats`
3. My Sections — `/teacher/sections`
4. Data Bank — `/teacher/databank`
5. All Teachers — `/teachers/view` (read-only)
6. All Students — `/students/view` (read-only)
7. All Sections — `/sections/view` (read-only)
8. All Subjects — `/subjects/view` (read-only)

### Student (2 links)
1. Dashboard — `/student`
2. Take Exam — `/student/exam`

---

## 6. Hooks

### useAuth — re-export of AuthContext hook
### useApiCall — wraps async with loading/error state
### useExam — live exam state (answers, navigation, debounced save, forceSave)
### useToast — toast notifications (success/error/warning/info, auto-dismiss 3500ms)

---

## 7. Library Modules

### adminApi.js
- `createTeacherUser(...)` — calls `create-user` Edge Function
- `createStudentUser(...)` — calls `create-user` Edge Function
- `setUserPassword({ userId, newPassword })` — calls `admin-set-password` Edge Function; used by both admin and teacher; scope enforced server-side

### examEngine.js
- `shuffle(arr)` — Fisher-Yates
- `buildWeightedExam(subjectQuestions, totalNeeded)` — proportional allocation + shortage fill
- `prepareQuestion(q, order)` — shuffles options, returns snapshot object
- `calculateScore(questions)` — `{ total, correct, percent }`
- `parseBulkQuestions(text)` — parses bulk upload text format

---

## 8. Utilities (`src/utils/`)

### formatters.js
Display formatting + sorting utilities:
- `formatTimer`, `formatDuration`, `formatScore`, `formatDate`, `formatDateTime`, `formatRelative`, `truncate`, `capitalize`, `formatNumber`
- `parseRegNumber(reg)` — parses IUB reg number into sortable components
- `compareRegNumbers(a, b)` — comparator for student reg number sort
- `parseSectionName(name)` — parses IUB section name into sortable components
- `compareSectionNames(a, b)` — comparator for section name sort

### IUB Reg Number Sort Logic (`compareRegNumbers`)
Pattern: `[S|F][YY][Campus][Dept][Program][Shift][Prefix][Serial]`
Example: `S23BARIN1M01037`

Sort priority (ascending):
1. Year (2-digit, e.g. 23 = 2023)
2. Semester: Spring (S=0) before Fall (F=1)
3. Program number: 1 (BS Morning) → 2 (BS Evening) → 7 (ADP)
4. Shift: Morning (M=0) before Evening (E=1)
5. Serial (last 3 digits)

### IUB Section Name Sort Logic (`compareSectionNames`)
Pattern: `BSARIN-[N]TH-[Num][Shift]`
Example: `BSARIN-7TH-1M`

Sort priority (ascending):
1. Semester number (7TH < 8TH < 9TH)
2. Section number (1 < 2 < 3)
3. Shift: Morning (M=0) before Evening (E=1)

Applied in: `Sections.jsx`, `Students.jsx` (dropdown), `SectionProgress.jsx` (tabs + default selection), `teacher/Dashboard.jsx` (sections overview), `admin/Dashboard.jsx` (teacher stats).

### validators.js
- `validateEmail`, `validatePassword`, `required`, `validateRange`, `validateRegNumber`
- `validateTeacherForm`, `validateStudentForm`, `validateSubjectForm`

### constants.js
- `APP_NAME` = `'DAI-NSCT'`
- `APP_FULL_NAME` = `'Department of Artificial Intelligence - National Skills Competency Test'`
- `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `ROLES`, `ATTEMPT_STATUS`, `GRADES`, `getGrade(percent)`

---

## 9. Layout & Branding

- `Footer` component — shown on all pages (login + all authenticated layouts)
  - Credits line (bold/white): "Powered by Prof. Dr. Najia Saher (Chairperson) · Developed by Mr. Muzammil Ur Rehman (Lecturer)"
  - Copyright line: "© {year} Department of Artificial Intelligence, Faculty of Computing, The Islamia University of Bahawalpur."
- Logo: `/dai-logo.png` — used in login screen, sidebar (all 3 instances), loading screen, SharedReport
- Favicon: `/favicon-96x96.png`, `/favicon.svg`, `/favicon.ico`, `/apple-touch-icon.png`, `/site.webmanifest`
- App title: `DAI-NSCT — Department of Artificial Intelligence - National Skills Competency Test`

---

## 10. Responsive Design

- Mobile-first TailwindCSS
- Sidebar hidden below `lg` breakpoint, slide-in drawer on mobile
- Tables scroll horizontally on small screens
- Touch-friendly button sizes (44px min on mobile)
- Font size 16px on inputs (prevents iOS zoom)
- SharedReport page has no layout wrapper — standalone responsive design
