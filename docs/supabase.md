# DAI-NSCT — Supabase Reference

> Knowledge base for developers and AI agents.
> Last updated: 2026-04-02 (rev 4)

---

## 1. Project Configuration

| Setting | Value |
|---|---|
| Platform | Supabase (free tier) |
| Database | PostgreSQL |
| Auth Provider | Supabase Auth (email/password) |
| Email Confirmation | Disabled (users created by admin, no email flow) |
| JWT Algorithm | HS256 (Supabase default) |
| Session Storage | localStorage (browser) |
| Auto Refresh Token | Enabled |
| Persist Session | Enabled |

Environment variables required:
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
```

---

## 2. Client Setup (`src/lib/supabase.js`)

```js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  }
)
```

- Single client instance exported and imported everywhere
- Throws at startup if env vars are missing
- Uses anon key — RLS policies enforce all access control

---

## 3. Authentication

### Flow
1. User submits email + password on `/login`
2. `supabase.auth.signInWithPassword({ email, password })` called
3. On success: JWT stored in localStorage by Supabase SDK
4. `user_profiles` row fetched to get role, is_active, must_change_password
5. AuthContext stores `user` + `profile` + sets `loading = false`
6. RequireAuth guard reads profile and routes accordingly

### Session Rehydration (on page load/refresh)
1. `supabase.auth.getSession()` called on AuthProvider mount
2. If valid session in localStorage → loads profile from DB
3. `onAuthStateChange` listener handles sign-out and token refresh events
4. `USER_UPDATED` event is intentionally skipped — `completePasswordChange` handles state directly

### Sign Out
- `supabase.auth.signOut()` clears localStorage JWT
- `onAuthStateChange` fires `SIGNED_OUT` → clears user + profile from context

### Force Password Change
1. `must_change_password = true` in user_profiles (set on user creation)
2. RequireAuth detects this and shows PasswordChangeModal (required=true, cannot dismiss)
3. User submits new password
4. `completePasswordChange(newPassword)`:
   - Validates complexity (8+ chars, 1 uppercase, 1 number)
   - `supabase.auth.updateUser({ password: newPassword })`
   - `supabase.from('user_profiles').update({ must_change_password: false })`
   - Patches in-memory profile state directly (no reload)
   - Navigates to role home

### Password Complexity Rules
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Enforced in both `validators.js` and `auth.js` (double validation)

---

## 4. User Creation

Regular users cannot self-register. All users are created by admin only.

### Why Edge Function?
Creating users requires `service_role` key (admin privileges). This key must never be exposed to the browser. The Edge Function runs server-side with access to `SUPABASE_SERVICE_ROLE_KEY`.

### Edge Function: `create-user`
- Path: `supabase/functions/create-user/index.ts`
- Runtime: Deno
- Deploy command: `supabase functions deploy create-user --no-verify-jwt`
- `--no-verify-jwt`: Gateway skips JWT check; function verifies JWT manually using service_role client

### Request Format
```json
POST /functions/v1/create-user
Headers:
  Authorization: Bearer <user-jwt>
  apikey: <anon-key>
  Content-Type: application/json

Body:
{
  "email": "user@example.com",
  "password": "Password1",
  "role": "teacher" | "student",
  "displayName": "Full Name",
  "extraData": {
    // For teacher:
    "designation": "Lecturer",
    "expertise": "Database Systems",
    // For student:
    "father_name": "Father Name",
    "reg_number": "REG-001",
    "section_id": "<uuid>"
  }
}
```

### Edge Function Logic (in order)
1. Handle CORS preflight (OPTIONS)
2. Build `adminClient` using `SUPABASE_SERVICE_ROLE_KEY`
3. Extract + verify caller's JWT via `adminClient.auth.getUser(token)`
4. Check caller's profile role = 'admin' (403 if not)
5. Parse + validate request body
6. `adminClient.auth.admin.createUser({ email, password, email_confirm: true })`
7. Insert `user_profiles` row: `{ id, role, display_name, is_active: true, must_change_password: true }`
8. If teacher: insert `teachers` row
9. If student: insert `students` row (requires reg_number, section_id, father_name)
10. On any step 7–9 failure: rollback by deleting auth user + profile
11. Return `{ userId, success: true }`

### Client Caller (`src/lib/adminApi.js`)
```js
// Both headers required:
'apikey': ANON_KEY,           // gateway requirement
'Authorization': `Bearer ${session.access_token}`  // our auth check
```

---

## 5. Row Level Security

All 9 tables have RLS enabled. `rls_forced = false` — service_role key bypasses RLS (correct for Edge Functions).

### Key Principle
Access control is entirely at the database level. The app never filters data manually — RLS policies handle it. If a query returns no rows, it means the policy denied access (not an error).

### SECURITY DEFINER Functions
Used inside policies to avoid infinite recursion (policies calling tables that have their own policies).

All 5 functions bypass RLS, run as DB owner:
- `get_my_role()` — returns current user's role
- `get_my_teacher_id()` — returns current teacher's id
- `get_my_student_id()` — returns current student's id
- `get_my_section_id()` — returns current student's section_id
- `get_my_teacher_section_ids()` — returns SET of section IDs for current teacher

All have `SET search_path TO 'public'` — protected against search_path injection.

### Access Matrix

| Table | Admin | Teacher | Student |
|---|---|---|---|
| user_profiles | Full | Own row only | Own row only |
| teachers | Full | All rows (SELECT only) | None |
| sections | Full | All rows (SELECT only) | Own section (SELECT) |
| students | Full | All rows (SELECT only) | Own row (SELECT + UPDATE) |
| subjects | Full | Active only (SELECT) | Active only (SELECT, only during active exam) |
| questions | Full | Full | Active only (SELECT, only during active exam) |
| exam_settings | Full | Read only | Read only |
| exam_attempts | Full | All rows (SELECT only) | Own rows (Full) |
| exam_question_snapshots | Full | Own section students (SELECT) | Own attempts (SELECT) |

Note: Teachers have SELECT on ALL records in teachers/sections/students/exam_attempts via `teacher_readonly_rls.sql`. Write operations remain admin-only.

---

## 6. Database Query Pattern (`src/lib/db.js`)

Supabase JS returns `{ data, error }` instead of throwing. All queries use wrapper functions:

```js
export async function dbQuery(queryBuilder) {
  const { data, error } = await queryBuilder
  if (error) throw new Error(error.message || JSON.stringify(error))
  return data
}

export const dbSelect = dbQuery
export const dbInsert = dbQuery
export const dbUpdate = dbQuery
export const dbDelete = dbQuery
```

Usage:
```js
const rows = await dbSelect(supabase.from('teachers').select('*'))
const row  = await dbInsert(supabase.from('teachers').insert(data).select().single())
await dbUpdate(supabase.from('teachers').update(data).eq('id', id))
await dbDelete(supabase.from('teachers').delete().eq('id', id))
```

---

## 7. Realtime

Not used. All data fetching is one-shot REST queries. No Supabase Realtime subscriptions.

---

## 8. Storage

Not used. No file uploads to Supabase Storage. Bulk question uploads are parsed client-side and inserted as text rows.

---

## 9. Free Tier Considerations

| Limit | Value | Impact |
|---|---|---|
| Database size | 500 MB | Safe — current DB is small |
| API requests | Unlimited | No issue |
| Auth users | 50,000 | No issue |
| Storage | 1 GB | Not used |
| Edge Function invocations | 500,000/month | Low usage (admin only) |
| Project pausing | After 1 week inactivity | Use UptimeRobot to ping every 10 min |

---

## 10. Supabase Dashboard Operations

### Creating Admin User (initial setup)
1. Authentication → Users → Add User
2. Email: `admin@dai-nsct.vercel.app`, Password: `Admin@1234`
3. Copy the UUID
4. Run `seed.sql` in SQL Editor (auto-finds UUID by email)

### Running SQL Migrations
SQL Editor → New Query → paste SQL → Run

### Deploying Edge Functions
```bash
supabase functions deploy create-user --no-verify-jwt
supabase functions deploy admin-set-password --no-verify-jwt
```

### Checking Edge Function Logs
Dashboard → Edge Functions → select function → Logs

### Disabling Email Confirmation (required for this app)
Authentication → Providers → Email → disable "Confirm email"

---

## 11. Known Issues & Fixes Applied

| Issue | Fix Applied |
|---|---|
| 42P17 infinite recursion on RLS policies | `fix_rls_recursion.sql` — replaced inline subqueries with SECURITY DEFINER functions |
| subjects/questions policies using non-SECURITY DEFINER get_my_role() | `fix_questions_subjects_rls.sql` — recreated policies using updated function |
| Students couldn't read snapshots for review page | `add_show_results_setting.sql` — added `snapshots_read_own` policy |
| Duplicate student snapshot policies | `recommendations.sql` — dropped redundant `student_own_snapshots` |
| exam_settings.updated_by FK was NO ACTION | `recommendations.sql` — changed to SET NULL |
| Teachers could only see own row / own sections / own section students | `teacher_readonly_rls.sql` — added read-all SELECT policies for teachers on teachers, sections, students, exam_attempts |
| Teachers couldn't INSERT into shared_reports for student attempts | `teacher_shared_reports_rls.sql` — added ALL policy for teachers scoped to their section students |
| UserPasswords page showed empty list for admin | Missing `supabase` import after refactor — re-added import to `UserPasswords.jsx` |

---

## 12. Edge Functions

| Function | File | Purpose | Deploy Command |
|---|---|---|---|
| `create-user` | `supabase/functions/create-user/index.ts` | Creates teacher/student auth + profile + record | `supabase functions deploy create-user --no-verify-jwt` |
| `admin-set-password` | `supabase/functions/admin-set-password/index.ts` | Admin resets any user's password | `supabase functions deploy admin-set-password --no-verify-jwt` |

### Edge Function: `admin-set-password`
- Caller must be authenticated as **admin or teacher** (verified via JWT + user_profiles role check)
- **Admin**: can reset any user's password
- **Teacher**: can only reset passwords for students in their assigned sections (enforced server-side by joining students → sections → teacher_id)
- Request body: `{ userId: "<auth_user_uuid>", newPassword: "<new_password>" }`
- Validates password complexity (8+ chars, 1 uppercase, 1 number)
- Calls `adminClient.auth.admin.updateUserById(userId, { password })`
- Also sets `must_change_password = false` for the target user
- Returns `{ success: true }` on success

### Access Matrix (updated)

| Table | Admin | Teacher | Student | Anon |
|---|---|---|---|---|
| user_profiles | Full | Own row only | Own row only | None |
| teachers | Full | All rows (SELECT only) | None | None |
| sections | Full | All rows (SELECT only) | Own section (SELECT) | None |
| students | Full | All rows (SELECT only) | Own row (SELECT + UPDATE) | None |
| subjects | Full | Active only (SELECT) | Active only (SELECT, only during active exam) | None |
| questions | Full | Full | Active only (SELECT, only during active exam) | None |
| exam_settings | Full | Read only | Read only | None |
| exam_attempts | Full | All rows (SELECT only) | Own rows (Full) | None |
| exam_question_snapshots | Full | Own section students (SELECT) | Own attempts (SELECT) | None |
| shared_reports | Full | Own section students' attempts (ALL) | Own attempts (INSERT + SELECT) | SELECT by token |
