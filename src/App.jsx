import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Spinner } from './components/ui/Spinner'
import { PasswordChangeModal } from './components/shared/PasswordChangeModal'
import { useState, useEffect, lazy, Suspense } from 'react'

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

// Guard: redirects to /login if not authenticated, checks role match
function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()

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

  return children
}

// Gate: shows force-password-change modal if must_change_password is true.
// Renders children only after password has been changed (or was never required).
function ForcePasswordChange({ children }) {
  const { profile, refreshProfile } = useAuth()
  const mustChange = profile?.must_change_password === true

  async function handleChanged() {
    await refreshProfile()
  }

  return (
    <>
      {/* Modal is always mounted when mustChange is true; required=true prevents dismissal */}
      <PasswordChangeModal
        open={mustChange}
        required={true}
        onClose={handleChanged}
      />
      {/* Only render the page once password is set */}
      {!mustChange && children}
    </>
  )
}

// Root redirect: sends authenticated users to their role home
function AuthRedirect() {
  const { user, profile, loading } = useAuth()

  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
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
            <Route path="/admin" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminDashboard /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/teachers" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminTeachers /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/students" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminStudents /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/sections" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminSections /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/subjects" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminSubjects /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/databank" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminDataBank /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/admin/settings" element={
              <RequireAuth role="admin"><ForcePasswordChange><AdminSettings /></ForcePasswordChange></RequireAuth>
            } />

            {/* ── Teacher ── */}
            <Route path="/teacher" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherDashboard /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/teacher/sections" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherSections /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/teacher/databank" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherDataBank /></ForcePasswordChange></RequireAuth>
            } />

            {/* ── Student ── */}
            <Route path="/student" element={
              <RequireAuth role="student"><ForcePasswordChange><StudentDashboard /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/student/exam" element={
              <RequireAuth role="student"><ForcePasswordChange><ExamLanding /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/student/exam/room" element={
              <RequireAuth role="student"><ExamRoom /></RequireAuth>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
