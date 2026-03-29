# NSCT — Application Reference

> Knowledge base for developers and AI agents.
> Last updated: 2026-03-29 (rev 2)

---

## 1. Routing

All routes are defined in `src/App.jsx`. Pages are lazy-loaded via `React.lazy` + `Suspense`.

| Path | Component | Role Required |
|---|---|---|
| `/login` | Login | None |
| `/` | AuthRedirect | Any (redirects to role home) |
| `/admin` | AdminDashboard | admin |
| `/admin/teachers` | AdminTeachers | admin |
| `/admin/students` | AdminStudents | admin |
| `/admin/sections` | AdminSections | admin |
| `/admin/subjects` | AdminSubjects | admin |
| `/admin/databank` | AdminDataBank | admin |
| `/admin/users/passwords` | AdminUserPasswords | admin |
| `/admin/settings` | AdminSettings | admin |
| `/teacher` | TeacherDashboard | teacher |
| `/teacher/sections` | TeacherSections | teacher |
| `/teacher/databank` | AdminDataBank (shared) | teacher |
| `/student` | StudentDashboard | student |
| `/student/exam` | ExamLanding | student |
| `/student/exam/room` | ExamRoom | student |
| `/student/exam/review/:attemptId` | ExamReview | student |
| `/report/:token` | SharedReport | None (public, no auth required) |
| `*` | Redirect to `/` | Any |

---

## 2. Auth Guard — RequireAuth

Every protected route is wrapped in `<RequireAuth role="...">`.

Checks in order:
1. If loading → show LoadingScreen
2. If no user or no profile → redirect to `/login`
3. If `profile.is_active === false` → show "Account Disabled" screen
4. If role mismatch → redirect to `/${profile.role}` (correct home)
5. If `profile.must_change_password === true` → show PasswordChangeModal (required, cannot dismiss)
6. Otherwise → render children

The `/report/:token` route is outside RequireAuth — fully public, no session needed.

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

Initialization:
1. On mount: calls `supabase.auth.getSession()` to rehydrate from localStorage
2. Subscribes to `onAuthStateChange` for sign-out and token refresh
3. Skips `USER_UPDATED` event — `completePasswordChange` handles state directly

---

## 4. Pages

### Login (`src/pages/Login.jsx`)
- Email + password form with show/hide toggle
- Calls `useAuth().signIn()`
- On success: useEffect watches profile and redirects to `/${profile.role}`
- Hint text: "Hint: Use your roll_number@iub.edu.pk as email." — do not change this message

### Admin Dashboard (`src/pages/admin/Dashboard.jsx`)
- Stats cards: total teachers, students, sections, subjects, questions, attempts
- "Performance by Teacher" table: sections, students, attempts, avg score
- "Top Students" table: ranked by average score

### Admin Teachers (`src/pages/admin/Teachers.jsx`)
- Table: teacher_name, designation, expertise, email, status, actions
- Add/Edit modal with form validation
- Toggle active/inactive
- Delete with ConfirmDialog
- Creates user via Edge Function `create-user` through `adminApi.createTeacherUser()`

### Admin Students (`src/pages/admin/Students.jsx`)
- Table: reg#, name, father name, section, status, actions
- Add/Edit modal with section dropdown
- Toggle active/inactive
- Delete with ConfirmDialog
- Creates user via Edge Function through `adminApi.createStudentUser()`

### Admin Sections (`src/pages/admin/Sections.jsx`)
- Card grid view
- Add/Edit modal: section_name, teacher_id (optional)
- Toggle active/inactive
- Delete with ConfirmDialog

### Admin Subjects (`src/pages/admin/Subjects.jsx`)
- Table: subject_name, description, weightage, question count, status
- Shows total active weightage and percentage breakdown
- Add/Edit modal with weightage validation (0.5–100)
- Toggle active/inactive
- Delete with ConfirmDialog

### Admin DataBank (`src/pages/admin/DataBank.jsx`)
- Table: question_text, subject, option count, status, actions
- Pagination: 50 per page
- Add/Edit modal:
  - Dynamic option rows (2–5 options)
  - Mark one as correct via pill toggle
  - Add/remove option buttons
  - Validation: question text required, subject required, 2+ options, exactly 1 correct
  - DB contract: correct answer rotated to option_a before saving
- Bulk upload modal (BulkUploadParser):
  - File upload or paste text
  - Parse & preview with format guide
  - Chunked insert: 100 questions per batch
- Toggle active/inactive
- Delete with ConfirmDialog
- Shared between admin and teacher roles

### Admin User Passwords (`src/pages/admin/UserPasswords.jsx`) — NEW
- Lists all users (admin + teachers + students) with name, email, role, status
- Search by name or email
- Filter by role (all / admin / teacher / student)
- "Change Password" button per row opens a modal
- Modal shows user's name, email, role for confirmation
- New password + confirm password fields with show/hide toggle
- Live validation checklist: 8+ chars, 1 uppercase, 1 number
- Confirm password match check
- On submit: calls Edge Function `admin-set-password` via service_role
- Also clears `must_change_password` flag for the target user
- Success/error toast notifications
- Accessible via sidebar nav: "User Passwords" with KeyRound icon

### Admin Settings (`src/pages/admin/Settings.jsx`)
- Exam config: total_questions (1–500), total_minutes (1–300)
- Toggle: show_results_to_students
- Change password button (opens PasswordChangeModal, optional mode)
- Shows last updated timestamp

### Teacher Dashboard (`src/pages/teacher/Dashboard.jsx`)
- Stats: my sections, total students, total attempts, avg score
- Sections overview table: section_name, student count, attempt count, avg score

### Teacher Section Progress (`src/pages/teacher/SectionProgress.jsx`)
- Section selector tabs
- Expandable student list
- Each student: collapsible attempts table
- Each attempt: date, score, correct/total, time taken, status badge

### Student Dashboard (`src/pages/student/Dashboard.jsx`)
- Stats: total attempts, average score, best score
- "Ready for a new attempt?" CTA card
- Attempts history (collapsible):
  - Date, time, score badge
  - Expanded: score, correct/total, status
  - "Review Questions & Answers" button (if show_results_to_students=true)
  - "Share Report" button — always visible for completed attempts

### Share Report Modal (inside Student Dashboard) — NEW
- Triggered by "Share Report" button on any completed attempt
- On open: checks if a share already exists for this attempt
  - If yes: shows existing URL + password (idempotent — same link every time)
  - If no: generates new UUID-based token + 16-char password, inserts into `shared_reports`
- Displays:
  - Full public URL: `{origin}/report/{token}`
  - 16-character password (alpha + numeric + symbols)
  - Copy button for each (shows checkmark on copy)
- Password generation rules: guaranteed at least 1 letter, 1 number, 1 symbol, shuffled
- Info note: "The same link and password will be shown if you share this attempt again."

### Exam Landing (`src/pages/student/ExamLanding.jsx`)
- Displays exam rules and subject distribution preview
- Shows estimated question count per subject based on weightage
- Validates before allowing start:
  - At least one active subject exists
  - Enough active questions exist across subjects
- Start Exam flow:
  1. Fetch active subjects + their active questions
  2. `buildWeightedExam()` — allocate questions by weightage
  3. `prepareQuestion()` — shuffle options per question
  4. Insert `exam_attempts` row (status: in_progress)
  5. Insert all `exam_question_snapshots`
  6. Navigate to `/student/exam/room` with `{ attemptId, settings }` in location.state

### Exam Room (`src/pages/student/ExamRoom.jsx`)
- Receives `attemptId` and `settings` from location.state
- If no attemptId → redirect to `/student`
- Loads questions from `exam_question_snapshots` ordered by `question_order`
- Sticky header: progress bar, question counter (X/Total), countdown timer, submit button
- Question display: question text + option buttons (A–E)
- Navigation: prev/next buttons + dot navigator (20 dots visible, scrollable)
- Timer: counts down from `settings.total_minutes * 60`, urgent pulse at <300s, auto-submits at 0
- Answer recording: debounced 800ms auto-save to DB
- Submit flow:
  1. For each snapshot: determine selected_label + is_correct
  2. Batch update all snapshots
  3. `calculateScore()` — compute correct count + percent
  4. Update `exam_attempts` row: status, submitted_at, time_taken_secs, correct_answers, score_percent
  5. Show inline results screen (no navigation)
- Results screen: score %, grade badge, correct/wrong/total, time taken, back to dashboard button

### Exam Review (`src/pages/student/ExamReview.jsx`)
- Route: `/student/exam/review/:attemptId`
- Checks `show_results_to_students` setting — redirects to `/student` if false
- Loads all snapshots for the attempt
- Displays each question with:
  - Question text
  - All options with color indicators: correct (green), wrong selected (red), skipped correct (outlined green)
  - Student's selected answer highlighted
- Summary bar: correct count, wrong count, skipped count
- Back to dashboard button

### Shared Report (`src/pages/SharedReport.jsx`) — NEW
- Route: `/report/:token` — fully public, no auth required
- Works for anyone: unauthenticated users, logged-in students, teachers, admins
- On load: fetches `shared_reports` row by token (anon RLS policy allows this)
  - If not found or expired → shows "Report Not Found" screen with ShieldOff icon
- Password gate screen:
  - Clean branded screen with NSCT logo
  - Password input with show/hide toggle
  - On submit: compares entered password against `password_plain` in DB
  - Wrong password → "Incorrect password. Please try again." error
  - Correct password → loads attempt + snapshots and renders full report
- Report view (no layout wrapper, standalone):
  - Top bar: NSCT brand + score + grade
  - Summary card: score %, correct, wrong, skipped, date, total questions, time taken
  - All questions with correct/wrong/skipped indicators (same style as ExamReview)
  - Footer: "National Skills Competency Test Platform · Shared Report"

---

## 5. Hooks

### useAuth (`src/hooks/useAuth.js`)
Re-export of `useContext(AuthContext)`. Provides all auth state and methods.

### useApiCall (`src/hooks/useApiCall.js`)
Wraps async functions with loading/error state management.
```js
const { run, loading, error } = useApiCall()
await run(async () => { /* your async code */ })
```
Eliminates repetitive try/catch/finally/setLoading boilerplate.

### useExam (`src/hooks/useExam.js`)
Manages live exam state during ExamRoom.
- State: answers map, currentIndex, saving flag
- `recordAnswer(snapshotId, label)` — debounced 800ms, saves to DB
- `goTo(index)`, `goNext()`, `goPrev()` — navigation
- `forceSave()` — immediate save before submit
- Derived: answeredCount, totalCount, progressPercent, isFirst, isLast, isAnswered(id)

### useToast (`src/hooks/useToast.js`)
Lightweight toast notification system.
- `toast(message, type, duration)` — types: success, error, warning, info
- `dismiss(key)`, `dismissAll()`
- Auto-dismisses after duration (default 3500ms)

---

## 6. Library Modules

### supabase.js
Creates and exports the Supabase client singleton.
- `persistSession: true` — JWT stored in localStorage
- `autoRefreshToken: true` — auto-refreshes before expiry
- Throws on missing env vars at startup

### auth.js
Auth helper functions:
- `signInWithEmail(email, password)` — returns `{ user, profile, session }`
- `signOut()`
- `getSession()` — one-shot, non-reactive
- `updatePassword(newPassword)` — validates complexity, updates auth + DB flag
- `adminCreateUser(email, password, role, displayName)` — calls Edge Function
- `roleHomePath(role)` — returns `/admin`, `/teacher`, `/student`

### db.js
Thin Supabase query wrappers that throw on error instead of returning `{ data, error }`.
- `dbQuery(queryBuilder)` — base wrapper
- `dbSelect`, `dbInsert`, `dbUpdate`, `dbDelete` — named aliases for clarity

### adminApi.js
Calls Supabase Edge Functions requiring service_role permissions.
- `createTeacherUser({ email, password, teacher_name, designation, expertise })`
- `createStudentUser({ email, password, student_name, father_name, reg_number, section_id })`
- Both send: `Authorization: Bearer <jwt>` + `apikey: <anon_key>` headers

### examEngine.js
Core exam logic:
- `shuffle(arr)` — Fisher-Yates in-place shuffle
- `buildWeightedExam(subjectQuestions, totalNeeded)` — proportional allocation + shortage fill
- `prepareQuestion(q, order)` — shuffles options, returns snapshot object
- `calculateScore(questions)` — returns `{ total, correct, percent }`
- `parseBulkQuestions(text)` — parses text format into question objects

---

## 7. UI Components

### Primitives (`src/components/ui/`)

| Component | Description |
|---|---|
| Button | variants: primary, secondary, ghost, danger, success, accent, outline; sizes: sm, md, lg; loading state |
| Input | label, error, hint, icon, iconRight, required indicator |
| Modal | accessible dialog, backdrop click to close, Escape key, required mode (no close) |
| Table | columns config, rows, keyField, loading skeleton, empty state, pagination |
| Badge | variants: success, danger, accent, primary, secondary, muted, warning; dot indicator |
| ScoreBadge | auto-colors by score % using GRADES thresholds |
| ActiveBadge | Active / Inactive |
| RoleBadge | role with color |
| Toast | success/error/warning/info with icons |
| ToastContainer | renders toast list |
| Spinner | sizes: sm, md, lg, xl; PageSpinner; InlineSpinner |
| ConfirmDialog | reusable confirmation modal with danger mode |

### Layout (`src/components/layout/`)
- `AdminLayout`, `TeacherLayout`, `StudentLayout` — all wrap Sidebar + MobileNav + main content
- `Sidebar` — desktop nav (hidden below lg breakpoint), brand, user info, nav links, logout
- `MobileNav` — top bar + slide-in drawer (visible below lg), same nav structure

Admin sidebar nav links (in order):
1. Dashboard — `/admin`
2. Teachers — `/admin/teachers`
3. Students — `/admin/students`
4. Sections — `/admin/sections`
5. Subjects — `/admin/subjects`
6. Data Bank — `/admin/databank`
7. User Passwords — `/admin/users/passwords` (KeyRound icon)
8. Settings — `/admin/settings`

### Shared (`src/components/shared/`)
- `PasswordChangeModal` — required (first login) or optional (settings); live validation checklist; 8+ chars, 1 uppercase, 1 number
- `SubjectWeightageForm` — editable weightage per subject, live question count breakdown, validates all > 0
- `BulkUploadParser` — file upload or paste text, format guide, parse & preview, chunked import (100/batch)

---

## 8. Utilities

### constants.js
- `APP_NAME`, `APP_FULL_NAME`
- `DEFAULT_ADMIN_EMAIL` — `admin@dai-nsct.vercel.app`
- `DEFAULT_ADMIN_PASSWORD` — `Admin@1234`
- `ROLES` — `{ ADMIN, TEACHER, STUDENT }`
- `ATTEMPT_STATUS` — `{ IN_PROGRESS, COMPLETED, TIMED_OUT }`
- `GRADES` — `[{ min, label, variant }]` — 80+ Excellent, 65+ Good, 50+ Pass, 0+ Fail
- `getGrade(percent)` — returns matching grade object
- `DEFAULT_PAGE_SIZE` — 50
- `TIMER_WARNING_SECS` — 300 (5 minutes)
- `BULK_INSERT_CHUNK` — 100
- `OPTION_LABELS` — `['A', 'B', 'C', 'D', 'E']`

### validators.js
All return `null` on success or an error string on failure.
- `validateEmail(email)`
- `validatePassword(password)` — 8+ chars, 1 uppercase, 1 number
- `required(value, fieldName)`
- `validateRange(value, min, max, fieldName)`
- `validateRegNumber(reg)` — alphanumeric + hyphens/slashes, 3–30 chars
- `validateTeacherForm(obj)` — returns error object
- `validateStudentForm(obj)` — returns error object
- `validateSubjectForm(obj)` — returns error object

### formatters.js
- `formatTimer(secs)` — `"mm:ss"`
- `formatDuration(secs)` — `"1h 1m 1s"`
- `formatScore(percent, decimals)` — `"73.3%"`
- `formatDate(dateStr)` — `"Mar 10, 2025"`
- `formatDateTime(dateStr)` — `"Mar 10, 2025 · 02:45 PM"`
- `formatRelative(dateStr)` — `"3 days ago"`
- `truncate(str, max)` — with ellipsis
- `capitalize(str)`
- `formatNumber(n)` — `"12,345"`

---

## 9. Responsive Design

- Mobile-first TailwindCSS
- Sidebar hidden below `lg` breakpoint, drawer on mobile
- Tables scroll horizontally on small screens
- Touch-friendly button sizes (44px min on mobile)
- Font size 16px on inputs (prevents iOS zoom)
- All pages work on phones, tablets, desktops
- SharedReport page has no layout wrapper — standalone responsive design
