import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { StudentLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Modal } from '../../components/ui/Modal'
import { ClipboardList, TrendingUp, Award, ChevronDown, ChevronUp, Eye, Share2, Copy, Check, KeyRound } from 'lucide-react'

// ─── Generate a 16-char password (alpha + numeric + symbols) ─────────────────
function generatePassword() {
  const alpha   = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const numeric = '0123456789'
  const symbols = '!@#$%^&*'
  const all     = alpha + numeric + symbols
  // Guarantee at least one of each category
  const pick = (str) => str[Math.floor(Math.random() * str.length)]
  const base = [pick(alpha), pick(numeric), pick(symbols)]
  for (let i = 3; i < 16; i++) base.push(pick(all))
  // Shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]]
  }
  return base.join('')
}

// ─── Share Report Modal ───────────────────────────────────────────────────────
function ShareReportModal({ attempt, open, onClose }) {
  const [shareData,  setShareData]  = useState(null)  // { url, password }
  const [generating, setGenerating] = useState(false)
  const [copiedUrl,  setCopiedUrl]  = useState(false)
  const [copiedPw,   setCopiedPw]   = useState(false)
  const [error,      setError]      = useState('')

  useEffect(() => {
    if (open && attempt) { setShareData(null); setError(''); generate() }
  }, [open, attempt?.id])

  async function generate() {
    setGenerating(true)
    setError('')
    try {
      // Check if a share already exists for this attempt
      const { data: existing } = await supabase
        .from('shared_reports')
        .select('token, password_plain')
        .eq('attempt_id', attempt.id)
        .maybeSingle()

      if (existing) {
        const url = `${window.location.origin}/report/${existing.token}`
        setShareData({ url, password: existing.password_plain })
        return
      }

      // Generate new token + password
      const token    = crypto.randomUUID().replace(/-/g, '')
      const password = generatePassword()

      const { error: insertErr } = await supabase.from('shared_reports').insert({
        attempt_id:     attempt.id,
        token,
        password_hash:  password, // storing plain as hash field for now (see note in SharedReport.jsx)
        password_plain: password,
      })
      if (insertErr) throw new Error(insertErr.message)

      const url = `${window.location.origin}/report/${token}`
      setShareData({ url, password })
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function copy(text, setCopied) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal open={open} onClose={onClose} title="Share Exam Report" size="sm">
      <p className="text-sm text-ink-muted mb-5">
        Share your exam report with anyone using the link and password below.
        The recipient will need the password to view the report.
      </p>

      {generating && (
        <div className="flex items-center justify-center py-8 gap-3 text-ink-muted">
          <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          Generating secure link…
        </div>
      )}

      {error && <p className="form-error mb-4">{error}</p>}

      {shareData && !generating && (
        <div className="flex flex-col gap-4">
          {/* URL */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-1.5">
              Report URL
            </label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1 text-xs font-mono bg-surface"
                value={shareData.url}
                readOnly
                onFocus={e => e.target.select()}
              />
              <button
                className="btn-outline px-3 flex-shrink-0"
                onClick={() => copy(shareData.url, setCopiedUrl)}
              >
                {copiedUrl ? <Check size={15} className="text-success" /> : <Copy size={15} />}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="form-label flex items-center gap-1.5 mb-1.5">
              <KeyRound size={13} className="text-primary" /> Report Password
            </label>
            <div className="flex gap-2">
              <input
                className="form-input flex-1 font-mono tracking-widest bg-surface"
                value={shareData.password}
                readOnly
                onFocus={e => e.target.select()}
              />
              <button
                className="btn-outline px-3 flex-shrink-0"
                onClick={() => copy(shareData.password, setCopiedPw)}
              >
                {copiedPw ? <Check size={15} className="text-success" /> : <Copy size={15} />}
              </button>
            </div>
            <p className="text-xs text-ink-muted mt-1.5">
              Share this password separately. Anyone with both the link and password can view this report.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-xs text-accent-dark">
            The same link and password will be shown if you share this attempt again.
          </div>
        </div>
      )}

      <div className="flex justify-end mt-5">
        <button className="btn-outline" onClick={onClose}>Close</button>
      </div>
    </Modal>
  )
}

export default function StudentDashboard() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [student,     setStudent]     = useState(null)
  const [attempts,    setAttempts]    = useState([])
  const [expanded,    setExpanded]    = useState(null)
  const [showResults, setShowResults] = useState(false)
  const [shareAttempt, setShareAttempt] = useState(null)
  const loader = useApiCall()
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const [stu, settings] = await Promise.all([
        dbQuery(supabase.from('students').select('*, sections(section_name)').eq('user_id', user.id).single()),
        dbQuery(supabase.from('exam_settings').select('show_results_to_students').single()),
      ])
      setStudent(stu)
      setShowResults(settings?.show_results_to_students === true)
      const atts = await dbQuery(
        supabase.from('exam_attempts')
          .select('*')
          .eq('student_id', stu.id)
          .neq('status', 'in_progress')
          .order('started_at', { ascending: false })
      )
      setAttempts(atts || [])
    })
  }

  if (loader.loading && !student) return <StudentLayout><PageSpinner /></StudentLayout>
  if (!student) return <StudentLayout><p className="text-ink-muted">Student profile not found.</p></StudentLayout>

  const completed = attempts.filter(a => a.status === 'completed')
  const avgScore  = completed.length ? completed.reduce((s, a) => s + a.score_percent, 0) / completed.length : 0
  const best      = completed.length ? Math.max(...completed.map(a => a.score_percent)) : 0

  return (
    <StudentLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="mb-6">
        <h1 className="page-title">Hello, {student.student_name} 👋</h1>
        <p className="text-ink-muted text-sm mt-1">
          {student.reg_number} · {student.sections?.section_name}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Attempts', value: completed.length,          icon: ClipboardList, color: 'text-primary bg-primary/10'    },
          { label: 'Average Score',  value: `${avgScore.toFixed(1)}%`, icon: TrendingUp,    color: 'text-secondary bg-secondary/10' },
          { label: 'Best Score',     value: `${best.toFixed(1)}%`,     icon: Award,         color: 'text-accent bg-accent/10'      },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}><Icon size={18} /></div>
            <div className="text-2xl font-bold text-ink">{value}</div>
            <div className="text-xs text-ink-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="card mb-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-display text-xl text-ink">Ready for a new attempt?</h3>
            <p className="text-sm text-ink-muted mt-1">Each exam is uniquely generated with randomized questions.</p>
          </div>
          <Link to="/student/exam" className="btn-primary">
            <ClipboardList size={16} /> Start Exam
          </Link>
        </div>
      </div>

      <div className="card">
        <h3 className="font-display text-lg text-ink mb-4">My Attempts</h3>
        {!attempts.length ? (
          <div className="text-center py-10 text-ink-muted">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
            <p>You haven't taken any exams yet.</p>
            <Link to="/student/exam" className="btn-primary mt-4 inline-flex">Take Your First Exam</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map((a, i) => (
              <div key={a.id} className="border border-surface-border rounded-xl overflow-hidden">
                <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface text-left transition-colors"
                  onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  <div className="w-8 h-8 rounded-full bg-surface-border flex items-center justify-center text-xs font-mono text-ink-muted">
                    {attempts.length - i}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-ink">
                      {new Date(a.started_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {new Date(a.started_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <span className={`badge ${a.score_percent >= 70 ? 'badge-success' : a.score_percent >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                    {a.score_percent?.toFixed(1)}%
                  </span>
                  {expanded === a.id ? <ChevronUp size={14} className="text-ink-faint" /> : <ChevronDown size={14} className="text-ink-faint" />}
                </button>
                {expanded === a.id && (
                  <div className="border-t border-surface-border bg-surface px-4 py-3">
                    <div className="grid grid-cols-3 gap-4 text-sm mb-3">
                      <div>
                        <div className="text-xs text-ink-muted">Score</div>
                        <div className="font-semibold text-ink">{a.score_percent?.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted">Correct / Total</div>
                        <div className="font-semibold text-ink">{a.correct_answers} / {a.total_questions}</div>
                      </div>
                      <div>
                        <div className="text-xs text-ink-muted">Status</div>
                        <span className={`badge ${a.status === 'completed' ? 'badge-success' : 'badge-accent'}`}>{a.status}</span>
                      </div>
                    </div>
                    {showResults && (
                      <button
                        className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                        onClick={() => navigate(`/student/exam/review/${a.id}`)}>
                        <Eye size={13} /> Review Questions &amp; Answers
                      </button>
                    )}
                    <button
                      className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1.5"
                      onClick={() => setShareAttempt(a)}>
                      <Share2 size={13} /> Share Report
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <ShareReportModal
        attempt={shareAttempt}
        open={!!shareAttempt}
        onClose={() => setShareAttempt(null)}
      />
    </StudentLayout>
  )
}
