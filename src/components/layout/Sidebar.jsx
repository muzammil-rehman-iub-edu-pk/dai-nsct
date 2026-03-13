import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, UserCheck, GraduationCap, School,
  FlaskConical, Database, Settings, LogOut, BookOpen,
  ClipboardList, ChevronRight,
} from 'lucide-react'

const NAV = {
  admin: [
    { to: '/admin',           label: 'Dashboard',  icon: LayoutDashboard, end: true },
    { to: '/admin/teachers',  label: 'Teachers',   icon: UserCheck  },
    { to: '/admin/students',  label: 'Students',   icon: GraduationCap },
    { to: '/admin/sections',  label: 'Sections',   icon: School },
    { to: '/admin/subjects',  label: 'Subjects',   icon: FlaskConical },
    { to: '/admin/databank',  label: 'Data Bank',  icon: Database },
    { to: '/admin/settings',  label: 'Settings',   icon: Settings },
  ],
  teacher: [
    { to: '/teacher',           label: 'Dashboard',    icon: LayoutDashboard, end: true },
    { to: '/teacher/sections',  label: 'My Sections',  icon: School },
    { to: '/teacher/databank',  label: 'Data Bank',    icon: Database },
  ],
  student: [
    { to: '/student',       label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/exam',  label: 'Take Exam', icon: ClipboardList },
  ],
}

const ROLE_GRADIENT = {
  admin:   'from-[#1e3a8a] to-[#4c1d95]',
  teacher: 'from-[#4c1d95] to-[#1e3a8a]',
  student: 'from-[#065f46] to-[#1e3a8a]',
}

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const links = NAV[profile?.role] || []

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const initial = profile?.display_name?.[0]?.toUpperCase() || '?'

  return (
    <aside className={`h-screen w-60 flex-shrink-0 flex flex-col bg-gradient-to-b ${ROLE_GRADIENT[profile?.role] || ROLE_GRADIENT.student} text-white`}>

      {/* Brand */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
            <BookOpen size={15} className="text-white" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">NSCT</span>
        </div>
        <p className="text-[11px] text-white/40 pl-10 leading-tight">National Skills Competency Test</p>
      </div>

      {/* User info */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
            <span className="text-xs capitalize text-white/50 leading-none">{profile?.role}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={11} className="opacity-30" />
          </NavLink>
        ))}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={handleLogout}
          className="w-full sidebar-link text-white/60 hover:text-white hover:bg-red-500/20"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
