# National Skills Competency Test (NSCT) — Master Implementation Guide

> **Stack**: React 18 + Vite · Supabase (free tier) · Vercel (free tier) · TailwindCSS · React Router v6

---

## Knowledge Base

Detailed documentation is maintained in the `/docs` folder. Always refer to these files for up-to-date information:

| File | Contents |
|---|---|
| [docs/project.md](docs/project.md) | Tech stack, architecture, project structure, deployment, design decisions |
| [docs/app.md](docs/app.md) | Routing, pages, components, hooks, utilities, auth guard logic |
| [docs/db.md](docs/db.md) | All tables, columns, constraints, indexes, RLS policies, functions, migration history |
| [docs/supabase.md](docs/supabase.md) | Supabase client setup, auth flow, Edge Functions, RLS access matrix, known issues |
| [docs/business-logic.md](docs/business-logic.md) | Purpose, roles, exam logic, rules, restrictions, cascade behavior, lifecycle |

---

## Table of Contents
1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Supabase Setup (Free Database)](#3-supabase-setup)
4. [Local Development Setup](#4-local-development-setup)
5. [Project Structure](#5-project-structure)
6. [Git Repository Setup](#6-git-repository-setup)
7. [Vercel Deployment](#7-vercel-deployment)
8. [Environment Variables](#8-environment-variables)
9. [Database Schema (SQL)](#9-database-schema)
10. [Vercel Free Tier Limitations & Mitigations](#10-vercel-limitations)
11. [Features Checklist](#11-features-checklist)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────┐
│                  Vercel (CDN)                 │
│         React SPA (Vite build output)         │
└──────────────────┬───────────────────────────┘
                   │ HTTPS API calls
┌──────────────────▼───────────────────────────┐
│              Supabase (Free Tier)             │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │  PostgreSQL  │  │  Row Level Security  │   │
│  │  Database    │  │  (RLS Policies)      │   │
│  └─────────────┘  └──────────────────────┘   │
│  ┌─────────────┐  ┌──────────────────────┐   │
│  │  Auth        │  │  Storage (optional)  │   │
│  │  (JWT based) │  │                      │   │
│  └─────────────┘  └──────────────────────┘   │
└──────────────────────────────────────────────┘
```

**Key design decisions:**
- Pure SPA — no Next.js API routes needed (avoids cold start latency on free Vercel)
- Supabase JS client talks directly to Supabase REST/RealTime
- All auth via Supabase Auth with custom `user_profiles` table (roles: admin/teacher/student)
- Passwords hashed by Supabase Auth (bcrypt under the hood)
- Exam state held in React state + saved to DB on navigation (debounced)

---

## 2. Prerequisites

Install these on your local machine before starting:

```bash
# Node.js 18+ (LTS recommended)
node --version   # should be 18.x or 20.x

# npm or pnpm
npm --version

# Git
git --version

# Vercel CLI (optional but helpful)
npm install -g vercel
```

Create free accounts at:
- https://github.com  (for repo)
- https://supabase.com  (free PostgreSQL database)
- https://vercel.com  (free hosting — connect your GitHub)

---

## 3. Supabase Setup

### 3.1 Create a Project
1. Go to https://supabase.com → **New Project**
2. Choose a name: `nsct-app`
3. Set a strong database password (save it!)
4. Region: choose closest to your users
5. Free tier: 500MB storage, 2GB bandwidth/month, 50MB DB

### 3.2 Get Your Keys
Dashboard → **Settings** → **API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

### 3.3 Run the SQL Schema
Go to **SQL Editor** → **New query** → paste the full schema from Section 9 → **Run**

### 3.4 Enable Email Auth
**Authentication** → **Providers** → **Email**: Enable, disable "Confirm email" for dev

---

## 4. Local Development Setup

```bash
# 1. Clone your repo (after setting it up per Section 6)
git clone https://github.com/YOUR_USERNAME/nsct-app.git
cd nsct-app

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env.local
# Edit .env.local with your Supabase keys

# 4. Start dev server
npm run dev
# App runs at http://localhost:5173

# 5. Default admin login
# Email: admin@dai-nsct.vercel.app
# Password: Admin@1234 (forced change on first login)
```

---

## 5. Project Structure

```
nsct-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Router setup
│   ├── index.css                   # Global styles + Tailwind
│   │
│   ├── lib/
│   │   ├── supabase.js             # Supabase client
│   │   ├── auth.js                 # Auth helpers
│   │   └── examEngine.js           # Exam generation logic
│   │
│   ├── contexts/
│   │   └── AuthContext.jsx         # Global auth state
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useExam.js
│   │   └── useToast.js
│   │
│   ├── components/
│   │   ├── ui/                     # Reusable UI primitives
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Toast.jsx
│   │   │   ├── Spinner.jsx
│   │   │   └── ConfirmDialog.jsx
│   │   │
│   │   ├── layout/
│   │   │   ├── AdminLayout.jsx
│   │   │   ├── TeacherLayout.jsx
│   │   │   ├── StudentLayout.jsx
│   │   │   └── Sidebar.jsx
│   │   │
│   │   └── shared/
│   │       ├── PasswordChangeModal.jsx
│   │       ├── SubjectWeightageForm.jsx
│   │       └── BulkUploadParser.jsx
│   │
│   ├── pages/
│   │   ├── Login.jsx               # Shared login page
│   │   │
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Teachers.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Sections.jsx
│   │   │   ├── Subjects.jsx
│   │   │   ├── DataBank.jsx
│   │   │   └── Settings.jsx        # Questions count, timer
│   │   │
│   │   ├── teacher/
│   │   │   ├── Dashboard.jsx
│   │   │   └── SectionProgress.jsx
│   │   │
│   │   └── student/
│   │       ├── Dashboard.jsx
│   │       ├── ExamLanding.jsx
│   │       └── ExamRoom.jsx        # The actual exam UI
│   │
│   └── utils/
│       ├── constants.js
│       ├── validators.js
│       └── formatters.js
│
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
├── vercel.json                     # SPA routing fix
└── MASTER_GUIDE.md                 # This file
```

---

## 6. Git Repository Setup

```bash
# In your project folder:
git init
git add .
git commit -m "feat: initial NSCT project scaffold"

# Create repo on GitHub (github.com → New repository → nsct-app)
git remote add origin https://github.com/YOUR_USERNAME/nsct-app.git
git branch -M main
git push -u origin main
```

### .gitignore (important — never commit secrets)
```
node_modules/
dist/
.env
.env.local
.env.*.local
*.log
.DS_Store
```

---

## 7. Vercel Deployment

### 7.1 Connect GitHub to Vercel
1. https://vercel.com → **Add New Project**
2. **Import Git Repository** → select `nsct-app`
3. Framework Preset: **Vite**
4. Build Command: `npm run build`
5. Output Directory: `dist`
6. Install Command: `npm install`

### 7.2 Add Environment Variables in Vercel
**Settings** → **Environment Variables**:
```
VITE_SUPABASE_URL        = https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY   = eyJhbG...
```

### 7.3 Deploy
Click **Deploy** — Vercel builds and hosts your app.  
Every `git push` to `main` auto-deploys.

### 7.4 Custom Domain (optional)
**Settings** → **Domains** → add your domain (free SSL included)

---

## 8. Environment Variables

```bash
# .env.example (commit this — no real values)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

```bash
# .env.local (never commit this)
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 9. Database Schema

Run this entire SQL in Supabase SQL Editor:

```sql
-- ============================================================
-- NSCT DATABASE SCHEMA
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- USER PROFILES (extends Supabase auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE user_profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  display_name  TEXT NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  must_change_password BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TEACHERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE teachers (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  teacher_name  TEXT NOT NULL,
  designation   TEXT,
  expertise     TEXT,
  email         TEXT UNIQUE NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- SECTIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE sections (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_name  TEXT UNIQUE NOT NULL,
  teacher_id    UUID REFERENCES teachers(id) ON DELETE SET NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- STUDENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE students (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID UNIQUE REFERENCES user_profiles(id) ON DELETE SET NULL,
  reg_number      TEXT UNIQUE NOT NULL,
  student_name    TEXT NOT NULL,
  father_name     TEXT NOT NULL,
  section_id      UUID NOT NULL REFERENCES sections(id) ON DELETE RESTRICT,
  email           TEXT UNIQUE NOT NULL,
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- SUBJECTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE subjects (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_name  TEXT UNIQUE NOT NULL,
  description   TEXT,
  weightage     NUMERIC(5,2) NOT NULL DEFAULT 10.00 CHECK (weightage > 0 AND weightage <= 100),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- QUESTIONS (Data Bank)
-- ────────────────────────────────────────────────────────────
CREATE TABLE questions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id      UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,
  option_a        TEXT NOT NULL,  -- Always the correct answer (shuffled at exam render)
  option_b        TEXT,
  option_c        TEXT,
  option_d        TEXT,
  option_e        TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  created_by      UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- EXAM SETTINGS (singleton row managed by admin)
-- ────────────────────────────────────────────────────────────
CREATE TABLE exam_settings (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  total_questions     INT NOT NULL DEFAULT 100,
  total_minutes       INT NOT NULL DEFAULT 100,
  updated_by          UUID REFERENCES user_profiles(id),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
-- Insert default settings
INSERT INTO exam_settings (total_questions, total_minutes) VALUES (100, 100);

-- ────────────────────────────────────────────────────────────
-- EXAM ATTEMPTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE exam_attempts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  started_at      TIMESTAMPTZ DEFAULT NOW(),
  submitted_at    TIMESTAMPTZ,
  time_taken_secs INT,
  total_questions INT NOT NULL,
  correct_answers INT DEFAULT 0,
  score_percent   NUMERIC(5,2) DEFAULT 0,
  status          TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','timed_out')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- EXAM QUESTION SNAPSHOTS (what was served to this student)
-- ────────────────────────────────────────────────────────────
CREATE TABLE exam_question_snapshots (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attempt_id      UUID NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id     UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  question_text   TEXT NOT NULL,  -- snapshot at time of exam
  options         JSONB NOT NULL, -- [{label:'A',text:'...',is_correct:true}, ...]
  selected_label  TEXT,           -- student's chosen label (A/B/C/D/E)
  is_correct      BOOLEAN,
  question_order  INT NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_questions_subject ON questions(subject_id);
CREATE INDEX idx_exam_attempts_student ON exam_attempts(student_id);
CREATE INDEX idx_snapshots_attempt ON exam_question_snapshots(attempt_id);
CREATE INDEX idx_students_section ON students(section_id);
CREATE INDEX idx_sections_teacher ON sections(teacher_id);

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_question_snapshots ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get my teacher id
CREATE OR REPLACE FUNCTION get_my_teacher_id()
RETURNS UUID AS $$
  SELECT id FROM teachers WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Helper: get my student id
CREATE OR REPLACE FUNCTION get_my_student_id()
RETURNS UUID AS $$
  SELECT id FROM students WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- user_profiles: users can read their own, admin reads all
CREATE POLICY "own_profile" ON user_profiles FOR SELECT USING (id = auth.uid() OR get_my_role() = 'admin');
CREATE POLICY "admin_manage_profiles" ON user_profiles FOR ALL USING (get_my_role() = 'admin');

-- teachers: admin full, teacher own, student none
CREATE POLICY "admin_all_teachers" ON teachers FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teacher_own" ON teachers FOR SELECT USING (user_id = auth.uid());

-- sections: admin full, teacher sees own, student sees own
CREATE POLICY "admin_all_sections" ON sections FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teacher_sees_sections" ON sections FOR SELECT USING (teacher_id = get_my_teacher_id() OR get_my_role() = 'admin');
CREATE POLICY "student_sees_section" ON sections FOR SELECT USING (
  id IN (SELECT section_id FROM students WHERE user_id = auth.uid())
  OR get_my_role() IN ('admin','teacher')
);

-- students: admin full, teacher sees own section, student sees own
CREATE POLICY "admin_all_students" ON students FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teacher_section_students" ON students FOR SELECT USING (
  section_id IN (SELECT id FROM sections WHERE teacher_id = get_my_teacher_id())
  OR get_my_role() = 'admin'
);
CREATE POLICY "student_own" ON students FOR SELECT USING (user_id = auth.uid());

-- subjects: admin full, others read active
CREATE POLICY "admin_all_subjects" ON subjects FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "others_read_active_subjects" ON subjects FOR SELECT USING (is_active = TRUE AND get_my_role() IN ('teacher','student'));

-- questions: admin full, teacher read/write, student none directly
CREATE POLICY "admin_all_questions" ON questions FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teacher_manage_questions" ON questions FOR ALL USING (get_my_role() = 'teacher');

-- exam_settings: admin full, others read
CREATE POLICY "admin_manage_settings" ON exam_settings FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "others_read_settings" ON exam_settings FOR SELECT USING (get_my_role() IN ('teacher','student'));

-- exam_attempts: admin/teacher see relevant, student sees own
CREATE POLICY "admin_all_attempts" ON exam_attempts FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "teacher_section_attempts" ON exam_attempts FOR SELECT USING (
  student_id IN (
    SELECT s.id FROM students s
    JOIN sections sec ON s.section_id = sec.id
    WHERE sec.teacher_id = get_my_teacher_id()
  ) OR get_my_role() = 'admin'
);
CREATE POLICY "student_own_attempts" ON exam_attempts FOR ALL USING (
  student_id = get_my_student_id()
);

-- snapshots
CREATE POLICY "admin_all_snapshots" ON exam_question_snapshots FOR ALL USING (get_my_role() = 'admin');
CREATE POLICY "student_own_snapshots" ON exam_question_snapshots FOR ALL USING (
  attempt_id IN (SELECT id FROM exam_attempts WHERE student_id = get_my_student_id())
);
CREATE POLICY "teacher_snapshots" ON exam_question_snapshots FOR SELECT USING (
  attempt_id IN (
    SELECT ea.id FROM exam_attempts ea
    JOIN students s ON ea.student_id = s.id
    JOIN sections sec ON s.section_id = sec.id
    WHERE sec.teacher_id = get_my_teacher_id()
  ) OR get_my_role() = 'admin'
);

-- ────────────────────────────────────────────────────────────
-- SEED: Default Admin User
-- (Run this AFTER creating admin user via Supabase Auth signup)
-- Replace 'ADMIN_AUTH_UUID' with the actual UUID from auth.users
-- ────────────────────────────────────────────────────────────
-- INSERT INTO user_profiles (id, role, display_name, must_change_password)
-- VALUES ('ADMIN_AUTH_UUID', 'admin', 'System Administrator', true);
```

> **Note**: After creating the admin user via Supabase Dashboard (Authentication → Users → Invite), copy the UUID and run the INSERT for user_profiles manually.

---

## 10. Vercel Free Tier Limitations & Mitigations

| Limitation | Free Tier Limit | Our Mitigation |
|---|---|---|
| Bandwidth | 100 GB/month | SPA with aggressive code-splitting; lazy loading |
| Serverless Function Duration | 10s (not used) | Pure SPA — no server functions needed |
| Build Time | 45 min/build | Vite is fast, builds in ~30s |
| Deployments | Unlimited | No issue |
| Custom Domains | Unlimited | Free SSL included |

| Supabase Free Tier Limit | Limit | Mitigation |
|---|---|---|
| Database Size | 500 MB | More than enough for this app |
| API Requests | Unlimited | No issue |
| Auth Users | 50,000 | No issue |
| Storage | 1 GB | We don't use file storage |
| Project Pausing | After 1 week inactivity | Set up uptime monitor (e.g., UptimeRobot free) to ping every 10 min |

**⚠️ Important**: Supabase free projects pause after 1 week of inactivity. Use https://uptimerobot.com (free) to ping your Supabase URL every 10 minutes to keep it alive.

---

## 11. Features Checklist

### Authentication & Security
- [x] JWT-based auth via Supabase Auth
- [x] Forced password change on first login
- [x] Role-based access control (admin/teacher/student)
- [x] Row Level Security on all tables
- [x] Bcrypt password hashing (Supabase handles this)
- [x] Session persistence via localStorage (Supabase SDK)
- [x] Account active/inactive status checks

### Admin Features
- [x] CRUD: Teachers (Name, Designation, Expertise, Email, Password, Active)
- [x] CRUD: Students (Reg#, Name, Father Name, Section, Email, Password, Active)
- [x] CRUD: Sections (Name, Assigned Teacher, Active)
- [x] CRUD: Subjects (Name, Description, Weightage %, Active)
- [x] Data Bank: Individual question add/edit/delete/toggle
- [x] Data Bank: Bulk upload via text file
- [x] Exam Settings: Total questions, total time
- [x] Dashboard: Per teacher stats, per student stats, filterable
- [x] Disable/Reactivate any user account

### Teacher Features
- [x] Login with own credentials
- [x] View assigned sections
- [x] View student list with attempt count + average score
- [x] Expand student to see individual attempts + scores
- [x] Add/edit questions to data bank

### Student Features
- [x] Login with own credentials
- [x] Force password change on first login
- [x] Dashboard: Own attempts history + scores
- [x] Take exam: 100 questions, 100 minutes timer
- [x] Single-page exam (conditional back/next)
- [x] Live progress bar + countdown timer
- [x] Results page after submission

### Exam Engine
- [x] Weighted question selection per active subject
- [x] Shuffled questions per student
- [x] Shuffled options (correct answer position randomized)
- [x] Auto-submit on timer expiry
- [x] Snapshot stored (tamper-proof results)
- [x] Different exam per student per attempt

---

## Quick Reference Commands

```bash
# Start dev
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Deploy to Vercel (if Vercel CLI installed)
vercel --prod

# Check types (if using TypeScript later)
npm run typecheck
```

---

*Generated for NSCT v1.0 — National Skills Competency Test Platform*
