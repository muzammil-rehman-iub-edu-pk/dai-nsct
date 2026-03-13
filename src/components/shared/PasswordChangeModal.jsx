import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../ui/Modal'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, ShieldCheck, CheckCircle } from 'lucide-react'

/**
 * PasswordChangeModal
 *
 * required=true  — first-login force change. Cannot be dismissed.
 *                  Calls completePasswordChange() from AuthContext, which:
 *                    1. Updates Supabase Auth password
 *                    2. Sets must_change_password=false in DB (awaited)
 *                    3. Patches in-memory profile state directly
 *                  Then navigates immediately — no timers, no reloads.
 *
 * required=false — optional change from Settings. Calls onClose() when done.
 */
export function PasswordChangeModal({ open, onClose, required = false }) {
  const { profile, completePasswordChange } = useAuth()
  const navigate = useNavigate()

  const [form, setForm]       = useState({ newPass: '', confirm: '' })
  const [show, setShow]       = useState(false)
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

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

    setLoading(true)
    setError('')

    try {
      if (required) {
        // completePasswordChange does everything in sequence and patches
        // the in-memory profile before returning — so profile.must_change_password
        // is already false by the time navigate() runs below.
        const updatedProfile = await completePasswordChange(form.newPass)
        // Navigate immediately — RequireAuth will see must_change_password=false
        // and render the dashboard instead of the modal
        navigate(`/${updatedProfile.role}`, { replace: true })
      } else {
        // Non-required flow (Settings page) — just update password
        const { supabase } = await import('../../lib/supabase')
        const { error: authErr } = await supabase.auth.updateUser({ password: form.newPass })
        if (authErr) throw authErr
        setForm({ newPass: '', confirm: '' })
        onClose()
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
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
            required
          />
        </div>

        {error && <p className="form-error text-sm">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          {!required && (
            <button type="button" className="btn-outline" onClick={() => onClose()}>Cancel</button>
          )}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading
              ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</span>
              : 'Update Password'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
