import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import {
  LayoutDashboard, UserCheck, GraduationCap, School,
  FlaskConical, Database, Settings, LogOut,
  ClipboardList, Menu, X, ChevronRight, KeyRound,
} from 'lucide-react'

const NAV = {
  admin: [
    { to: '/admin',                  label: 'Dashboard',      icon: LayoutDashboard, end: true },
    { to: '/admin/teachers',         label: 'Teachers',       icon: UserCheck },
    { to: '/admin/students',         label: 'Students',       icon: GraduationCap },
    { to: '/admin/sections',         label: 'Sections',       icon: School },
    { to: '/admin/subjects',         label: 'Subjects',       icon: FlaskConical },
    { to: '/admin/databank',         label: 'Data Bank',      icon: Database },
    { to: '/admin/users/passwords',  label: 'User Passwords', icon: KeyRound },
    { to: '/admin/settings',         label: 'Settings',       icon: Settings },
  ],
  teacher: [
    { to: '/teacher',          label: 'Dashboard',   icon: LayoutDashboard, end: true },
    { to: '/teacher/sections', label: 'My Sections', icon: School },
    { to: '/teacher/databank', label: 'Data Bank',   icon: Database },
  ],
  student: [
    { to: '/student',      label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/student/exam', label: 'Take Exam', icon: ClipboardList },
  ],
}

const ROLE_GRADIENT = {
  admin:   'from-[#1e3a8a] to-[#4c1d95]',
  teacher: 'from-[#4c1d95] to-[#1e3a8a]',
  student: 'from-[#065f46] to-[#1e3a8a]',
}

// Shared nav link used in both sidebar and mobile drawer
function NavItem({ to, label, icon: Icon, end, onClick }) {
  return (
    <NavLink to={to} end={end} onClick={onClick}
      className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
      <Icon size={16} className="flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      <ChevronRight size={11} className="opacity-30 flex-shrink-0" />
    </NavLink>
  )
}

// ─── Desktop/tablet sidebar (hidden on mobile) ───────────────────────────────
export function Sidebar() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()
  const links    = NAV[profile?.role] || []
  const gradient = ROLE_GRADIENT[profile?.role] || ROLE_GRADIENT.student
  const initial  = profile?.display_name?.[0]?.toUpperCase() || '?'

  async function handleLogout() { await signOut(); navigate('/login') }

  return (
    <aside className={`
      hidden lg:flex                          /* hidden mobile, flex desktop */
      h-screen w-60 flex-shrink-0 flex-col
      bg-gradient-to-b ${gradient} text-white
    `}>
      {/* Brand */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5 mb-0.5">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/dai-logo.png" alt="DAI" className="w-full h-full object-contain p-0.5" />
          </div>
          <span className="font-display text-lg font-bold text-white tracking-tight">DAI-NSCT</span>
        </div>
        <p className="text-[11px] text-white/40 pl-10 leading-tight">Dept. of AI - National Skills Competency Test</p>
      </div>

      {/* User */}
      <div className="px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-semibold text-sm flex-shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
            <span className="text-xs capitalize text-white/50">{profile?.role}</span>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
        {links.map(l => <NavItem key={l.to} {...l} />)}
      </nav>

      {/* Logout */}
      <div className="px-3 pb-5">
        <button onClick={handleLogout}
          className="w-full sidebar-link text-white/60 hover:text-white hover:bg-red-500/20">
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  )
}

// ─── Mobile top bar + slide-in drawer ────────────────────────────────────────
export function MobileNav() {
  const { profile, signOut } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [open, setOpen] = useState(false)
  const links     = NAV[profile?.role] || []
  const gradient  = ROLE_GRADIENT[profile?.role] || ROLE_GRADIENT.student
  const initial   = profile?.display_name?.[0]?.toUpperCase() || '?'

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [location.pathname])

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handleLogout() { setOpen(false); await signOut(); navigate('/login') }

  return (
    <>
      {/* Top bar — only visible on mobile/tablet */}
      <header className={`
        lg:hidden sticky top-0 z-30
        flex items-center justify-between
        px-4 h-14
        bg-gradient-to-r ${gradient} text-white
        shadow-sm
      `}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-white/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
            <img src="/dai-logo.png" alt="DAI" className="w-full h-full object-contain p-0.5" />
          </div>
          <span className="font-display text-base font-bold text-white tracking-tight">DAI-NSCT</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-white/70 hidden sm:block">{profile?.display_name}</span>
          <button onClick={() => setOpen(true)}
            className="w-9 h-9 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Open menu">
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
             onClick={() => setOpen(false)} />
      )}

      {/* Drawer */}
      <div className={`
        lg:hidden fixed top-0 left-0 z-50 h-full w-72 max-w-[85vw]
        flex flex-col
        bg-gradient-to-b ${gradient} text-white
        shadow-lift
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
              <img src="/dai-logo.png" alt="DAI" className="w-full h-full object-contain p-0.5" />
            </div>
            <span className="font-display text-lg font-bold text-white">DAI-NSCT</span>
          </div>
          <button onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            aria-label="Close menu">
            <X size={18} />
          </button>
        </div>

        {/* User */}
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-semibold">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.display_name}</p>
              <span className="text-xs capitalize text-white/50">{profile?.role}</span>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5 overflow-y-auto">
          {links.map(l => (
            <NavItem key={l.to} {...l} onClick={() => setOpen(false)} />
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6">
          <button onClick={handleLogout}
            className="w-full sidebar-link text-white/60 hover:text-white hover:bg-red-500/20">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  )
}
