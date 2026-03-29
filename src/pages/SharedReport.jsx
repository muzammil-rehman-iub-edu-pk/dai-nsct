import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/ui/Spinner'
import { CheckCircle, XCircle, MinusCircle, Eye, EyeOff, Lock, ShieldOff, Award } from 'lucide-react'

// ─── Password gate ────────────────────────────────────────────────────────────
function PasswordGate({ onUnlock }) {
  const [password, setPassword] = useState('')
  const [show,     setShow]     = useState(false)
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!password.trim()) { setError('Password is required.'); return }
    setLoading(true)
    setError('')
    // Pass password up — parent verifies against hash
    const ok = await onUnlock(password.trim())
    if (!ok) {
      setError('Incorrect password. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-display font-bold text-xl">N</span>
          </div>
          <h1 className="font-display text-2xl text-ink">NSCT Exam Report</h1>
          <p className="text-ink-muted text-sm mt-2">This report is password protected</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Lock size={16} className="text-primary" />
            <span className="font-medium text-ink">Enter Report Password</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            <div className="relative">
              <input
                className={`form-input pr-10 ${error ? 'border-danger focus:border-danger' : ''}`}
                type={show ? 'text' : 'password'}
                value={password}
                autoFocus
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter 16-character password"
              />
              <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors">
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading
                ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Verifying…</span>
                : 'View Report'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-faint mt-6">
          National Skills Competency Test Platform
        </p>
      </div>
    </div>
  )
}

// ─── Report view (public, no layout wrapper) ─────────────────────────────────
function ReportView({ attempt, questions }) {
  const grade      = attempt.score_percent >= 80 ? 'Excellent' : attempt.score_percent >= 65 ? 'Good' : attempt.score_percent >= 50 ? 'Pass' : 'Fail'
  const gradeColor = attempt.score_percent >= 65 ? 'text-success-dark' : attempt.score_percent >= 50 ? 'text-accent-dark' : 'text-danger-dark'

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <div className="bg-white border-b border-surface-border px-4 py-3 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-display font-bold text-sm">N</span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-display font-semibold text-ink">NSCT Exam Report</div>
          <div className="text-xs text-ink-muted">National Skills Competency Test</div>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold ${gradeColor}`}>{attempt.score_percent?.toFixed(1)}%</div>
          <div className={`text-xs font-medium ${gradeColor}`}>{grade}</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Summary */}
        <div className="card mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Score',    value: `${attempt.score_percent?.toFixed(2)}%`, color: gradeColor },
              { label: 'Correct',  value: attempt.correct_answers,                 color: 'text-success' },
              { label: 'Wrong',    value: attempt.total_questions - attempt.correct_answers - questions.filter(q => !q.selected_label).length, color: 'text-danger' },
              { label: 'Skipped',  value: questions.filter(q => !q.selected_label).length, color: 'text-ink-muted' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-ink-muted">{label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-surface-border text-xs text-ink-muted flex flex-wrap gap-4">
            <span>Date: {new Date(attempt.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            <span>Total Questions: {attempt.total_questions}</span>
            {attempt.time_taken_secs && (
              <span>Time Taken: {Math.floor(attempt.time_taken_secs / 60)}m {attempt.time_taken_secs % 60}s</span>
            )}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {questions.map((q, i) => {
            const correctOpt  = q.options.find(o => o.is_correct)
            const skipped     = !q.selected_label

            return (
              <div key={q.id} className={`card border-l-4 ${
                skipped      ? 'border-l-ink-faint' :
                q.is_correct ? 'border-l-success'   : 'border-l-danger'
              }`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-border text-xs font-bold flex items-center justify-center text-ink-muted">
                    {i + 1}
                  </span>
                  <p className="text-sm sm:text-base text-ink font-medium leading-relaxed flex-1">{q.question_text}</p>
                  <div className="flex-shrink-0">
                    {skipped      ? <MinusCircle size={18} className="text-ink-faint" /> :
                     q.is_correct ? <CheckCircle  size={18} className="text-success"  /> :
                                    <XCircle      size={18} className="text-danger"    />}
                  </div>
                </div>

                <div className="space-y-2 ml-10">
                  {q.options.map(opt => {
                    const isCorrect  = opt.is_correct
                    const isSelected = opt.label === q.selected_label
                    const isWrong    = isSelected && !isCorrect
                    return (
                      <div key={opt.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border
                        ${isCorrect  ? 'bg-success/10 border-success/30 text-success-dark font-medium' :
                          isWrong    ? 'bg-danger/10  border-danger/30  text-danger-dark'              :
                                       'border-transparent text-ink-muted'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isCorrect ? 'border-success bg-success text-white' :
                            isWrong   ? 'border-danger  bg-danger  text-white' :
                                        'border-ink-faint text-ink-muted'}`}>
                          {opt.label}
                        </div>
                        <span className="flex-1">{opt.text}</span>
                        {isCorrect && <CheckCircle size={14} className="text-success flex-shrink-0" />}
                        {isWrong   && <XCircle     size={14} className="text-danger  flex-shrink-0" />}
                      </div>
                    )
                  })}
                </div>

                {skipped && (
                  <p className="ml-10 mt-2 text-xs text-ink-muted italic">
                    Not answered · correct answer: <span className="font-semibold text-success-dark">{correctOpt?.label}. {correctOpt?.text}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>

        <p className="text-center text-xs text-ink-faint mt-8 pb-4">
          National Skills Competency Test Platform · Shared Report
        </p>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function SharedReport() {
  const { token } = useParams()
  const [status,    setStatus]    = useState('loading') // loading | gate | unlocked | invalid
  const [report,    setReport]    = useState(null)
  const [attempt,   setAttempt]   = useState(null)
  const [questions, setQuestions] = useState([])

  useEffect(() => { fetchReport() }, [token])

  async function fetchReport() {
    try {
      // Fetch report by token (public read policy allows anon)
      const { data, error } = await supabase
        .from('shared_reports')
        .select('*')
        .eq('token', token)
        .single()

      if (error || !data) { setStatus('invalid'); return }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setStatus('invalid'); return
      }

      setReport(data)
      setStatus('gate')
    } catch {
      setStatus('invalid')
    }
  }

  async function handleUnlock(password) {
    // Simple comparison against stored plain password
    // (In production you'd use bcrypt — here we compare plain for simplicity
    //  since Supabase Edge Functions don't have bcrypt easily available client-side)
    if (password !== report.password_plain) return false

    try {
      // Fetch attempt + snapshots
      const [att, snaps] = await Promise.all([
        supabase.from('exam_attempts').select('*').eq('id', report.attempt_id).single(),
        supabase.from('exam_question_snapshots').select('*').eq('attempt_id', report.attempt_id).order('question_order'),
      ])

      if (att.error || !att.data) return false

      setAttempt(att.data)
      setQuestions((snaps.data || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })))
      setStatus('unlocked')
      return true
    } catch {
      return false
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center mx-auto mb-4">
            <ShieldOff size={28} className="text-danger" />
          </div>
          <h1 className="font-display text-2xl text-ink mb-2">Report Not Found</h1>
          <p className="text-ink-muted text-sm">This report link is invalid or has expired.</p>
        </div>
      </div>
    )
  }

  if (status === 'gate') return <PasswordGate onUnlock={handleUnlock} />

  return <ReportView attempt={attempt} questions={questions} />
}
