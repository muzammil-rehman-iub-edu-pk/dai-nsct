import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { PageSpinner } from '../../components/ui/Spinner'
import { PasswordChangeModal } from '../../components/shared/PasswordChangeModal'
import { Settings, Clock, HelpCircle, Save } from 'lucide-react'

export default function AdminSettings() {
  const [settings, setSettings] = useState(null)
  const [form, setForm]         = useState({ total_questions: 100, total_minutes: 100 })
  const [pwModal, setPwModal]   = useState(false)

  const { toasts, toast, dismiss } = useToast()
  const loader = useApiCall()
  const saver  = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const data = await dbQuery(supabase.from('exam_settings').select('*').single())
      setSettings(data)
      setForm({ total_questions: data.total_questions, total_minutes: data.total_minutes })
    })
  }

  async function handleSave() {
    const q = parseInt(form.total_questions)
    const m = parseInt(form.total_minutes)
    if (isNaN(q) || q < 1 || q > 500) { toast('Questions must be 1–500', 'error'); return }
    if (isNaN(m) || m < 1 || m > 300) { toast('Minutes must be 1–300', 'error'); return }

    try {
      await saver.run(async () => {
        const { data: { user } } = await supabase.auth.getUser()
        await dbQuery(
          supabase.from('exam_settings')
            .update({ total_questions: q, total_minutes: m, updated_by: user.id, updated_at: new Date().toISOString() })
            .eq('id', settings.id)
        )
      })
      toast('Settings saved', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loader.loading && !settings) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="text-ink-muted text-sm mt-1">Configure exam parameters and account settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
        <div className="card col-span-full">
          <div className="flex items-center gap-2 mb-5">
            <Settings size={18} className="text-primary" />
            <h2 className="font-display text-xl text-ink">Exam Configuration</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="form-label flex items-center gap-1.5">
                <HelpCircle size={14} className="text-primary" /> Total Questions per Exam
              </label>
              <input className="form-input" type="number" min="1" max="500"
                     value={form.total_questions}
                     onChange={e => setForm(f => ({ ...f, total_questions: e.target.value }))} />
              <p className="text-xs text-ink-muted mt-1">Distributed by subject weightage</p>
            </div>
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Clock size={14} className="text-primary" /> Time Limit (minutes)
              </label>
              <input className="form-input" type="number" min="1" max="300"
                     value={form.total_minutes}
                     onChange={e => setForm(f => ({ ...f, total_minutes: e.target.value }))} />
              <p className="text-xs text-ink-muted mt-1">Exam auto-submits when timer expires</p>
            </div>
          </div>
          {settings && (
            <p className="text-xs text-ink-muted mt-4">
              Last updated: {new Date(settings.updated_at).toLocaleString()}
            </p>
          )}
          <div className="mt-5">
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              <Save size={16} />
              {saver.loading ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-xl text-ink mb-4">Account Security</h2>
          <p className="text-sm text-ink-muted mb-4">Change your admin account password.</p>
          <button className="btn-outline" onClick={() => setPwModal(true)}>Change Password</button>
        </div>
      </div>

      <PasswordChangeModal open={pwModal} onClose={() => setPwModal(false)} required={false} />
    </AdminLayout>
  )
}
