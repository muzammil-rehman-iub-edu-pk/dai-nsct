import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Spinner } from './components/ui/Spinner'
import { PasswordChangeModal } from './components/shared/PasswordChangeModal'
import { useState, useEffect } from 'react'

// Lazy load pages for code splitting
import { lazy, Suspense } from 'react'
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
const TeacherDataBank  = lazy(() => import('./pages/admin/DataBank'))  // reuse
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

function RequireAuth({ children, role }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <LoadingScreen />
  if (!user || !profile) return <Navigate to="/login" replace />
  if (!profile.is_active) return (
    <div className="h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="font-display text-2xl text-danger mb-2">Account Disabled</h2>
        <p className="text-ink-muted">Your account has been deactivated. Contact your administrator.</p>
      </div>
    </div>
  )
  if (role && profile.role !== role) return <Navigate to={`/${profile.role}`} replace />
  return children
}

function ForcePasswordChange({ children }) {
  const { profile, refreshProfile } = useAuth()
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (profile?.must_change_password) setShow(true)
  }, [profile])

  return (
    <>
      <PasswordChangeModal open={show} required
        onClose={(changed) => { if (changed) { setShow(false); refreshProfile() } }} />
      {!show && children}
    </>
  )
}

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

            {/* Admin */}
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

            {/* Teacher */}
            <Route path="/teacher" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherDashboard /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/teacher/sections" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherSections /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/teacher/databank" element={
              <RequireAuth role="teacher"><ForcePasswordChange><TeacherDataBank /></ForcePasswordChange></RequireAuth>
            } />

            {/* Student */}
            <Route path="/student" element={
              <RequireAuth role="student"><ForcePasswordChange><StudentDashboard /></ForcePasswordChange></RequireAuth>
            } />
            <Route path="/student/exam" element={
              <RequireAuth role="student"><ExamLanding /></RequireAuth>
            } />
            <Route path="/student/exam/room" element={
              <RequireAuth role="student"><ExamRoom /></RequireAuth>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
