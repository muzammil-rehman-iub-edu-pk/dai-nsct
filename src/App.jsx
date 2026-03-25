import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Spinner } from './components/ui/Spinner'
import { PasswordChangeModal } from './components/shared/PasswordChangeModal'
import { lazy, Suspense, useState, useEffect } from 'react'

const Login            = lazy(() => import('./pages/Login'))
const AdminDashboard   = lazy(() => import('./pages/admin/Dashboard'))
const AdminTeachers    = lazy(() => import('./pages/admin/Teachers'))
const AdminStudents    = lazy(() => import('./pages/admin/Students'))
const AdminSections    = lazy(() => import('./pages/admin/Sections'))
const AdminSubjects    = lazy(() => import('./pages/admin/Subjects'))
const AdminDataBank    = lazy(() => import('./pages/admin/DataBank'))
const AdminSettings    = lazy(() => import('./pages/admin/Settings'))
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'))
const TeacherSections  = lazy(() => import('./pages/teacher/SectionProgress'))
const TeacherDataBank  = lazy(() => import('./pages/admin/DataBank'))
const StudentDashboard = lazy(() => import('./pages/student/Dashboard'))
const ExamLanding      = lazy(() => import('./pages/student/ExamLanding'))
const ExamRoom         = lazy(() => import('./pages/student/ExamRoom'))
const ExamReview       = lazy(() => import('./pages/student/ExamReview'))

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <span className="text-white font-display font-bold text-lg">N</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  )
}

// Single guard: handles auth check, role check, AND force-password-change
// Reads must_change_password directly from profile — no extra context layer
function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()

  // must_change_password comes straight from the freshly-loaded profile row.
  // We show the modal only when it's explicitly true — undefined/null = let through.
  const mustChange = profile?.must_change_password === true

  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />

  if (!profile.is_active) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface">
        <div className="text-center max-w-sm">
          <h2 className="font-display text-2xl text-danger mb-2">Account Disabled</h2>
          <p className="text-ink-muted">Your account has been deactivated. Contact your administrator.</p>
        </div>
      </div>
    )
  }

  if (role && profile.role !== role) {
    return <Navigate to={`/${profile.role}`} replace />
  }

  // Show force-change modal over a blank screen (not over the page)
  // so there is nothing behind it that leaks data
  if (mustChange) {
    return (
      <div className="h-screen bg-surface">
        <PasswordChangeModal open={true} required={true} onClose={() => {}} />
      </div>
    )
  }

  return children
}

function AuthRedirect() {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (profile.must_change_password) return <Navigate to={`/${profile.role}`} replace />
  return <Navigate to={`/${profile.role}`} replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<AuthRedirect />} />

            {/* ── Admin ── */}
            <Route path="/admin" element={<RequireAuth role="admin"><AdminDashboard /></RequireAuth>} />
            <Route path="/admin/teachers" element={<RequireAuth role="admin"><AdminTeachers /></RequireAuth>} />
            <Route path="/admin/students" element={<RequireAuth role="admin"><AdminStudents /></RequireAuth>} />
            <Route path="/admin/sections" element={<RequireAuth role="admin"><AdminSections /></RequireAuth>} />
            <Route path="/admin/subjects" element={<RequireAuth role="admin"><AdminSubjects /></RequireAuth>} />
            <Route path="/admin/databank" element={<RequireAuth role="admin"><AdminDataBank /></RequireAuth>} />
            <Route path="/admin/settings" element={<RequireAuth role="admin"><AdminSettings /></RequireAuth>} />

            {/* ── Teacher ── */}
            <Route path="/teacher" element={<RequireAuth role="teacher"><TeacherDashboard /></RequireAuth>} />
            <Route path="/teacher/sections" element={<RequireAuth role="teacher"><TeacherSections /></RequireAuth>} />
            <Route path="/teacher/databank" element={<RequireAuth role="teacher"><TeacherDataBank /></RequireAuth>} />

            {/* ── Student ── */}
            <Route path="/student" element={<RequireAuth role="student"><StudentDashboard /></RequireAuth>} />
            <Route path="/student/exam" element={<RequireAuth role="student"><ExamLanding /></RequireAuth>} />
            <Route path="/student/exam/room" element={<RequireAuth role="student"><ExamRoom /></RequireAuth>} />
            <Route path="/student/exam/review/:attemptId" element={<RequireAuth role="student"><ExamReview /></RequireAuth>} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
