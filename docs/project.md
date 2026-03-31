# DAI-NSCT — Project Overview

> Knowledge base for developers and AI agents.
> Last updated: 2026-04-01 (rev 3)

---

## 1. Identity

| Field | Value |
|---|---|
| App Name | DAI-NSCT |
| Full Name | Department of Artificial Intelligence - National Skills Competency Test |
| Version | 1.0.0 |
| Type | Web Application (SPA) |
| Purpose | Online MCQ-based competency examination platform for DAI, IUB |
| Default Admin Email | admin@dai-nsct.vercel.app |
| Default Admin Password | Admin@1234 (forced change on first login) |

---

## 2. Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend Framework | React | 18.2.0 |
| Build Tool | Vite | 5.1.0 |
| Routing | React Router DOM | 6.22.0 |
| Styling | TailwindCSS | 3.4.1 |
| Icons | Lucide React | 0.344.0 |
| Database | Supabase (PostgreSQL) | Latest |
| Auth | Supabase Auth (JWT + bcrypt) | 2.39.0 |
| Backend Functions | Supabase Edge Functions (Deno) | Latest |
| Hosting | Vercel (free tier) | Latest |
| Language | JavaScript (JSX) + TypeScript (Edge Functions) | ES2022 |
| CSS Processing | PostCSS + Autoprefixer | Latest |
| Linting | ESLint | 8.56.0 |

---

## 3. Architecture

```
┌─────────────────────────────────────┐
│           Vercel CDN                │
│     React SPA (Vite build)          │
└──────────────┬──────────────────────┘
               │ HTTPS
┌──────────────▼──────────────────────┐
│         Supabase (Free Tier)        │
│  PostgreSQL + RLS + Auth + Edge Fn  │
└─────────────────────────────────────┘
```

- Pure SPA — no Next.js, no SSR, no API routes
- Supabase JS client communicates directly with Supabase REST API
- All access control enforced at DB level via Row Level Security (RLS)
- Edge Functions used only for admin user creation (requires service_role key)
- No Redux or Zustand — local useState + AuthContext only

---

## 4. Project Structure

```
nsct-app/
├── public/
│   └── favicon.svg
├── src/
│   ├── main.jsx                    # React entry point
│   ├── App.jsx                     # Router + auth guards
│   ├── index.css                   # Global styles + Tailwind directives
│   ├── lib/
│   │   ├── supabase.js             # Supabase client instance
│   │   ├── auth.js                 # Auth helper functions
│   │   ├── adminApi.js             # Edge Function callers
│   │   ├── db.js                   # Supabase query wrappers
│   │   └── examEngine.js           # Exam generation + scoring logic
│   ├── contexts/
│   │   └── AuthContext.jsx         # Global auth state provider
│   ├── hooks/
│   │   ├── useAuth.js              # Auth context consumer
│   │   ├── useApiCall.js           # Async operation wrapper
│   │   ├── useExam.js              # Live exam state manager
│   │   └── useToast.js             # Toast notification manager
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
│   │   ├── layout/
│   │   │   ├── Layout.jsx          # AdminLayout, TeacherLayout, StudentLayout
│   │   │   └── Sidebar.jsx         # Desktop sidebar + MobileNav
│   │   └── shared/
│   │       ├── PasswordChangeModal.jsx
│   │       ├── SubjectWeightageForm.jsx
│   │       └── BulkUploadParser.jsx
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── SharedReport.jsx            # Public password-protected report page
│   │   ├── admin/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Teachers.jsx
│   │   │   ├── Students.jsx
│   │   │   ├── Sections.jsx
│   │   │   ├── Subjects.jsx
│   │   │   ├── DataBank.jsx
│   │   │   ├── UserPasswords.jsx       # Admin user password management
│   │   │   └── Settings.jsx
│   │   ├── teacher/
│   │   │   ├── Dashboard.jsx
│   │   │   └── SectionProgress.jsx
│   │   └── student/
│   │       ├── Dashboard.jsx
│   │       ├── ExamLanding.jsx
│   │       ├── ExamRoom.jsx
│   │       └── ExamReview.jsx
│   └── utils/
│       ├── constants.js
│       ├── validators.js
│       └── formatters.js
├── supabase/
│   └── functions/
│       ├── create-user/
│       │   └── index.ts               # Creates teacher/student auth accounts
│       └── admin-set-password/
│           └── index.ts               # Admin resets any user's password
├── docs/                           # Knowledge base (this folder)
│   ├── project.md
│   ├── app.md
│   ├── db.md
│   ├── supabase.md
│   └── business-logic.md
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
├── vercel.json
├── feature_shared_reports.sql
├── inspect_db.sql
├── analyze_db.sql
├── recommendations.sql
└── MASTER_GUIDE.md
```

---

## 5. Environment Variables

| Variable | Description | Required |
|---|---|---|
| VITE_SUPABASE_URL | Supabase project URL | Yes |
| VITE_SUPABASE_ANON_KEY | Supabase anon/public key | Yes |

Both are prefixed with `VITE_` so Vite exposes them to the browser bundle.
Never commit real values — use `.env.local` locally and Vercel environment variables in production.

---

## 6. Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (localhost:5173) |
| `npm run build` | Production build to /dist |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint check on src/ |

---

## 7. Deployment

- Hosting: Vercel (free tier)
- Build command: `npm run build`
- Output directory: `dist`
- `vercel.json` rewrites all 404s to `index.html` for SPA routing
- Every push to `main` branch auto-deploys via GitHub integration
- Environment variables set in Vercel dashboard under Settings → Environment Variables

---

## 8. Free Tier Limits

| Service | Limit | Status |
|---|---|---|
| Vercel Bandwidth | 100 GB/month | Safe — SPA with code splitting |
| Vercel Build Time | 45 min/build | Safe — Vite builds in ~30s |
| Supabase DB Size | 500 MB | Safe — current DB is small |
| Supabase Auth Users | 50,000 | Safe |
| Supabase Project Pausing | After 1 week inactivity | Mitigate with UptimeRobot ping |

---

## 9. Key Design Decisions

1. Pure SPA — avoids Vercel cold start latency from serverless functions
2. RLS at DB level — no backend auth logic needed in application code
3. Correct answer always stored as `option_a` — shuffling happens at exam render time only
4. Snapshots for exam results — tamper-proof, each student gets unique question+option order
5. Weighted question distribution — proportional allocation by subject weightage
6. Debounced auto-save (800ms) during exam — reduces DB writes
7. Force password change on first login — security best practice
8. Lazy loading all pages — faster initial load, pages load on demand
9. Edge Functions for user creation and password management — service_role key never exposed to browser
10. `rls_auto_enable` DB trigger — any new table created in public schema gets RLS automatically
11. Public shareable reports — password-protected, no auth required, token-based URL
12. Teacher read-only views — teachers see all data via RLS SELECT policies; write operations remain admin-only
13. IUB-specific sort logic — students sorted by reg_number pattern, sections sorted by semester/shift pattern
14. `RequireTeacher` guard — injects `isReadOnly=true` via `React.cloneElement`, enforces teacher role on `/*/view` routes
