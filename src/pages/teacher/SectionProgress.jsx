import { useEffect, useState } from 'react'
import { TeacherLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { Modal } from '../../components/ui/Modal'
import { ToastContainer } from '../../components/ui/Toast'
import { setUserPassword } from '../../lib/adminApi'
import { ChevronDown, ChevronUp, Users, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react'

function formatTime(secs) {
  if (!secs) return '—'
  return `${Math.floor(secs / 60)}m ${secs % 60}s`
}

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
function ChangePasswordModal({ student, open, onClose, onSuccess }) {
  const [form, setForm]   = useState({ newPass: '', confirm: '' })
  const [show, setShow]   = useState(false)
  const [error, setError] = useState('')
  const saver = useApiCall()

  useEffect(() => {
    if (open) { setForm({ newPass: '', confirm: '' }); setError(''); setShow(false) }
  }, [open])

  async function handleSubmit(e) {
    e.preventDefault()
    const err = validate(form.newPass, form.confirm)
    if (err) { setError(err); return }
    setError('')
    try {
      await saver.run(() => setUserPassword({ userId: student.user_id, newPassword: form.newPass }))
      onSuccess()
      onClose()
    } catch (err) {
      setError(err.message)
    }
  }

  if (!student) return null

  return (
    <Modal open={open} onClose={onClose} title="Change Student Password" size="sm">
      <div className="mb-4 p-3 rounded-xl bg-surface border border-surface-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {student.student_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="text-sm font-medium text-ink">{student.student_name}</div>
            <div className="text-xs text-ink-muted">{student.reg_number}</div>
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
export default function TeacherSectionProgress() {
  const { user } = useAuth()
  const [sections,   setSections]   = useState([])
  const [selSection, setSelSec]     = useState('')
  const [expanded,   setExpanded]   = useState({})
  const [pwStudent,  setPwStudent]  = useState(null)  // student selected for password change
  const loader = useApiCall()
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const teacher = await dbQuery(
        supabase.from('teachers').select('id').eq('user_id', user.id).single()
      )
      const secs = await dbQuery(
        supabase.from('sections')
          .select(`id, section_name,
            students(id, user_id, student_name, reg_number,
              exam_attempts(id, started_at, submitted_at, score_percent,
                correct_answers, total_questions, status, time_taken_secs))`)
          .eq('teacher_id', teacher.id)
          .order('section_name')
      )
      const processed = (secs || []).map(sec => ({
        ...sec,
        students: sec.students.map(stu => ({
          ...stu,
          attempts: [...(stu.exam_attempts || [])]
            .filter(a => a.status !== 'in_progress')
            .sort((a, b) => new Date(b.started_at) - new Date(a.started_at)),
          avg: (() => {
            const done = stu.exam_attempts.filter(a => a.status === 'completed')
            return done.length ? done.reduce((s, a) => s + a.score_percent, 0) / done.length : 0
          })(),
        })),
      }))
      setSections(processed)
      if (processed.length) setSelSec(processed[0].id)
    })
  }

  const currentSection = sections.find(s => s.id === selSection)

  if (loader.loading && !sections.length) return <TeacherLayout><PageSpinner /></TeacherLayout>

  return (
    <TeacherLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="mb-6">
        <h1 className="page-title">Section Progress</h1>
        <p className="text-ink-muted text-sm mt-1">View student attempts, scores, and manage passwords</p>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap overflow-x-auto pb-1">
        {sections.map(sec => (
          <button key={sec.id}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors
                        ${selSection === sec.id ? 'bg-secondary text-white shadow-sm' : 'bg-white border border-surface-border text-ink-muted hover:text-ink'}`}
            onClick={() => setSelSec(sec.id)}>
            {sec.section_name}
            <span className="ml-2 text-xs opacity-60">{sec.students.length}</span>
          </button>
        ))}
        {!sections.length && <p className="text-ink-muted">No sections assigned.</p>}
      </div>

      {currentSection && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display text-lg text-ink flex items-center gap-2">
              <Users size={18} className="text-secondary" /> {currentSection.section_name}
            </h3>
            <span className="badge badge-primary">{currentSection.students.length} students</span>
          </div>

          <div className="space-y-2">
            {currentSection.students.map(stu => (
              <div key={stu.id} className="border border-surface-border rounded-xl overflow-hidden">
                {/* Student header row */}
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-surface transition-colors">
                  {/* Expand toggle */}
                  <button
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                    onClick={() => setExpanded(e => ({ ...e, [stu.id]: !e[stu.id] }))}>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                      {stu.student_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink">{stu.student_name}</div>
                      <div className="text-xs text-ink-muted">{stu.reg_number}</div>
                    </div>
                    <div className="text-sm text-ink-muted flex-shrink-0">{stu.attempts.length} attempts</div>
                    <div className="flex-shrink-0">
                      {stu.attempts.length > 0
                        ? <span className={`badge ${stu.avg >= 70 ? 'badge-success' : stu.avg >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                            Avg {stu.avg.toFixed(1)}%
                          </span>
                        : <span className="badge badge-muted">No attempts</span>}
                    </div>
                    {expanded[stu.id] ? <ChevronUp size={16} className="text-ink-faint flex-shrink-0" /> : <ChevronDown size={16} className="text-ink-faint flex-shrink-0" />}
                  </button>

                  {/* Password button — only if student has a linked auth account */}
                  {stu.user_id && (
                    <button
                      className="btn-outline py-1.5 px-3 text-xs flex items-center gap-1.5 flex-shrink-0"
                      onClick={() => setPwStudent(stu)}
                      title="Change student password">
                      <KeyRound size={13} /> Password
                    </button>
                  )}
                </div>

                {/* Expanded attempts table */}
                {expanded[stu.id] && (
                  <div className="border-t border-surface-border bg-surface px-4 py-3">
                    {!stu.attempts.length
                      ? <p className="text-sm text-ink-muted py-2">No completed attempts yet.</p>
                      : (
                        <table className="table-base">
                          <thead>
                            <tr><th>#</th><th>Date</th><th>Score</th><th>Correct</th><th>Time</th><th>Status</th></tr>
                          </thead>
                          <tbody>
                            {stu.attempts.map((a, i) => (
                              <tr key={a.id}>
                                <td className="text-ink-faint text-xs">{stu.attempts.length - i}</td>
                                <td className="text-xs">{new Date(a.started_at).toLocaleDateString()}</td>
                                <td>
                                  <span className={`badge ${a.score_percent >= 70 ? 'badge-success' : a.score_percent >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                                    {a.score_percent?.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="text-sm">{a.correct_answers}/{a.total_questions}</td>
                                <td className="text-xs text-ink-muted">{formatTime(a.time_taken_secs)}</td>
                                <td>
                                  <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-accent'}`}>
                                    {a.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                  </div>
                )}
              </div>
            ))}
            {!currentSection.students.length && (
              <p className="text-ink-muted text-sm py-4">No students in this section.</p>
            )}
          </div>
        </div>
      )}

      <ChangePasswordModal
        student={pwStudent}
        open={!!pwStudent}
        onClose={() => setPwStudent(null)}
        onSuccess={() => toast(`Password updated for ${pwStudent?.student_name}`, 'success')}
      />
    </TeacherLayout>
  )
}
