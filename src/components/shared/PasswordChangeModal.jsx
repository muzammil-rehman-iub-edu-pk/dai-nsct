import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react'

export function PasswordChangeModal({ open, onClose, required = false }) {
  const { profile } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState({ newPass: '', confirm: '' })
  const [show, setShow]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone]       = useState(false)

  const rules = [
    { test: v => v.length >= 8,   label: 'At least 8 characters' },
    { test: v => /[A-Z]/.test(v), label: 'One uppercase letter'  },
    { test: v => /[0-9]/.test(v), label: 'One number'            },
  ]

  function validate() {
    for (const rule of rules) {
      if (!rule.test(form.newPass)) return rule.label + ' required.'
    }
    if (form.newPass !== form.confirm) return 'Passwords do not match.'
    return ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    // ✅ Capture role NOW — before any async that might clear profile
    const destinationRole = profile?.role
    if (required && !destinationRole) {
      setError('Session error — please refresh the page and try again.')
      return
    }

    setLoading(true)
    setError('')
    try {
      // 1. Update password
      const { error: authErr } = await supabase.auth.updateUser({ password: form.newPass })
      if (authErr) throw authErr

      // 2. Flip flag in DB
      const { data: { user } } = await supabase.auth.getUser()
      const { error: dbErr } = await supabase
        .from('user_profiles')
        .update({ must_change_password: false, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      if (dbErr) throw dbErr

      setForm({ newPass: '', confirm: '' })
      setDone(true)

      if (required) {
        // Navigate using the role we captured before the async chain
        // Use replace so back-button doesn't return to the password screen
        setTimeout(() => navigate(`/${destinationRole}`, { replace: true }), 900)
      } else {
        setTimeout(() => { setDone(false); onClose() }, 900)
      }
    } catch (err) {
      setError(err.message)
      setDone(false)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <Modal open={open} title="Password Updated" size="sm" required>
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle size={28} className="text-success" />
          </div>
          <p className="font-medium text-ink">Password changed successfully!</p>
          <p className="text-sm text-ink-muted">
            {required ? 'Redirecting to your dashboard…' : 'Closing…'}
          </p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open={open}
      onClose={required ? undefined : () => onClose()}
      title={required ? 'Set Your New Password' : 'Change Password'}
      size="sm"
      required={required}
    >
      {required && (
        <div className="mb-4 p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent-dark flex items-start gap-2">
          <ShieldCheck size={16} className="flex-shrink-0 mt-0.5" />
          You must set a new password before accessing the system.
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="form-label">New Password <span className="text-danger">*</span></label>
          <div className="relative">
            <input
              className="form-input pr-10"
              type={show ? 'text' : 'password'}
              value={form.newPass}
              onChange={e => setForm(f => ({ ...f, newPass: e.target.value }))}
              placeholder="Enter new password"
              autoFocus
              required
            />
            <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.newPass && (
            <ul className="mt-2 space-y-1">
              {rules.map(r => (
                <li key={r.label} className={`text-xs flex items-center gap-1.5 ${r.test(form.newPass) ? 'text-success' : 'text-ink-faint'}`}>
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
            required
          />
        </div>

        {error && <p className="form-error text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          {!required && (
            <button type="button" className="btn-outline" onClick={() => onClose()}>Cancel</button>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Saving…' : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
