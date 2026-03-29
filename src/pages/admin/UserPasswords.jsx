import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../../components/ui/Modal'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Search, KeyRound, Eye, EyeOff, ShieldCheck, Users } from 'lucide-react'

// ─── Password rules ───────────────────────────────────────────────────────────
const RULES = [
  { test: v => v.length >= 8,   label: 'At least 8 characters'  },
  { test: v => /[A-Z]/.test(v), label: 'One uppercase letter'   },
  { test: v => /[0-9]/.test(v), label: 'One number'             },
]

function validate(newPass, confirm) {
  for (const r of RULES) if (!r.test(newPass)) return r.label + ' required.'
  if (newPass !== confirm) return 'Passwords do not match.'
  return ''
}

// ─── Change Password Modal ────────────────────────────────────────────────────
function ChangePasswordModal({ user, open, onClose, onSuccess }) {
  const [form, setForm]   = useState({ newPass: '', confirm: '' })
  const [show, setShow]   = useState(false)
  const [error, setError] = useState('')
  const saver = useApiCall()

  // Reset form when modal opens
  useEffect(() => {
    if (open) { setForm({ newPass: '', confirm: '' }); setError(''); setShow(false) }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate(form.newPass, form.confirm)
    if (err) { setError(err); return }
    setError('')
    try {
      await saver.run(async () => {
        // Call Edge Function to update password via service role
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-set-password`,
          {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'apikey':        import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ userId: user.auth_id, newPassword: form.newPass }),
          }
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update password')
      })
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} title="Change User Password" size="sm">
      <div className="mb-4 p-3 rounded-xl bg-surface border border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {user.display_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-ink">{user.display_name}</div>
            <div className="text-xs text-ink-muted">{user.email} · <span className="capitalize">{user.role}</span></div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="form-label">New Password <span className="text-danger">*</span></label>
          <div className="relative">
            <input
              className="form-input pr-10"
              type={show ? 'text' : 'password'}
              value={form.newPass}
              autoFocus
              onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
              placeholder="Enter new password"
            />
            <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.newPass && (
            <ul className="mt-2 space-y-1">
              {RULES.map(r => (
                <li key={r.label}
                  className={`text-xs flex items-center gap-1.5 ${r.test(form.newPass) ? 'text-success' : 'text-ink-faint'}`}>
                  <span>{r.test(form.newPass) ? '✓' : '○'}</span> {r.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
          <input
            className="form-input"
            type={show ? 'text' : 'password'}
            value={form.confirm}
            onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
            placeholder="Repeat new password"
          />
          {form.confirm && form.newPass !== form.confirm && (
            <p className="form-error mt-1">Passwords do not match.</p>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={saver.loading}>
            {saver.loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</span>
              : <><ShieldCheck size={15} /> Update Password</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminUserPasswords() {
  const [users,       setUsers]       = useState([])
  const [search,      setSearch]      = useState('')
  const [roleFilter,  setRoleFilter]  = useState('all')
  const [selected,    setSelected]    = useState(null)
  const [modalOpen,   setModalOpen]   = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const loader = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      // Fetch all profiles joined with teacher/student email
      const profiles = await dbQuery(
        supabase.from('user_profiles').select('*').order('display_name')
      )

      // Fetch emails from teachers and students tables
      const [teachers, students] = await Promise.all([
        dbQuery(supabase.from('teachers').select('user_id, email')),
        dbQuery(supabase.from('students').select('user_id, email')),
      ])

      const emailMap = {}
      for (const t of teachers || []) if (t.user_id) emailMap[t.user_id] = t.email
      for (const s of students || []) if (s.user_id) emailMap[s.user_id] = s.email

      // For admin, get email from auth — we store it in display context
      // We'll show email from teachers/students tables; admin email shown as N/A
      const enriched = (profiles || []).map(p => ({
        ...p,
        auth_id: p.id,
        email: emailMap[p.id] || (p.role === 'admin' ? 'admin@nsct.edu' : '—'),
      }))

      setUsers(enriched)
    })
  }

  function openChange(user) {
    setSelected(user)
    setModalOpen(true)
  }

  const filtered = users.filter(u => {
    const matchRole   = roleFilter === 'all' || u.role === roleFilter
    const q           = search.toLowerCase()
    const matchSearch = !q ||
      u.display_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    return matchRole && matchSearch
  })

  const roleBadge = {
    admin:   'badge-danger',
    teacher: 'badge-accent',
    student: 'badge-primary',
  }

  if (loader.loading && !users.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="page-title">User Passwords</h1>
        <p className="text-ink-muted text-sm mt-1">Search and reset passwords for any user account</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            className="form-input pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="form-input w-auto"
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {u.display_name?.[0]?.toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{u.display_name}</span>
                  </div>
                </td>
                <td className="text-ink-muted text-sm">{u.email}</td>
                <td><span className={`badge ${roleBadge[u.role] || 'badge-muted'}`}>{u.role}</span></td>
                <td>
                  <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5"
                    onClick={() => openChange(u)}
                  >
                    <KeyRound size={13} /> Change Password
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && !loader.loading && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-ink-muted">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ChangePasswordModal
        user={selected}
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => toast(`Password updated for ${selected?.display_name}`, 'success')}
      />
    </AdminLayout>
  )
}
