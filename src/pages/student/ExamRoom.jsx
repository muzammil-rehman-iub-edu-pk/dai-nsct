import { useEffect, useState, useRef, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { calculateScore } from '../../lib/examEngine'
import { Spinner } from '../../components/ui/Spinner'
import { Clock, ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Flag, Award } from 'lucide-react'

export default function ExamRoom() {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { attemptId, settings } = location.state || {}

  const [questions, setQuestions]   = useState([])
  const [answers, setAnswers]       = useState({})
  const [current, setCurrent]       = useState(0)
  const [timeLeft, setTimeLeft]     = useState(null)
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult]         = useState(null)
  const startTime = useRef(Date.now())
  const timerRef  = useRef(null)

  useEffect(() => {
    if (!attemptId) { navigate('/student'); return }
    loadQuestions()
  }, [])

  // Countdown — 1 second tick (legitimate timer use)
  useEffect(() => {
    if (timeLeft === null) return
    if (timeLeft <= 0) { handleSubmit(true); return }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timeLeft])

  async function loadQuestions() {
    const data = await dbQuery(
      supabase.from('exam_question_snapshots')
        .select('*').eq('attempt_id', attemptId).order('question_order')
    )
    setQuestions(data || [])
    const saved = {}
    for (const q of data || []) { if (q.selected_label) saved[q.id] = q.selected_label }
    setAnswers(saved)
    setTimeLeft((settings?.total_minutes || 100) * 60)
    setLoading(false)
  }

  function handleAnswer(snapshotId, label) {
    setAnswers(a => ({ ...a, [snapshotId]: label }))
  }

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (submitting) return
    setSubmitting(true)
    clearTimeout(timerRef.current)
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000)

    const updates = questions.map(q => {
      const chosen  = answers[q.id] || null
      const correct = chosen ? q.options.find(o => o.label === chosen)?.is_correct === true : false
      return { id: q.id, selected_label: chosen, is_correct: correct }
    })

    await Promise.all(updates.map(u =>
      supabase.from('exam_question_snapshots')
        .update({ selected_label: u.selected_label, is_correct: u.is_correct }).eq('id', u.id)
    ))

    const score = calculateScore(updates)
    await supabase.from('exam_attempts').update({
      status:          autoSubmit ? 'timed_out' : 'completed',
      submitted_at:    new Date().toISOString(),
      time_taken_secs: timeTaken,
      correct_answers: score.correct,
      score_percent:   score.percent,
    }).eq('id', attemptId)

    setResult({ ...score, timeTaken, status: autoSubmit ? 'timed_out' : 'completed' })
    setSubmitting(false)
  }, [questions, answers, submitting])

  function fmtTime(secs) {
    if (secs === null) return '--:--'
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const answered  = Object.keys(answers).length
  const total     = questions.length
  const progress  = total > 0 ? (answered / total) * 100 : 0
  const isUrgent  = timeLeft !== null && timeLeft < 300
  const q         = questions[current]

  // ── RESULTS ──────────────────────────────────────────────────────────────
  if (result) {
    const grade     = result.percent >= 80 ? 'Excellent' : result.percent >= 65 ? 'Good' : result.percent >= 50 ? 'Pass' : 'Fail'
    const gradeColor = result.percent >= 65 ? 'text-success-dark' : result.percent >= 50 ? 'text-accent-dark' : 'text-danger-dark'
    const gradeBg   = result.percent >= 65 ? 'bg-success/10 border-success/20' : result.percent >= 50 ? 'bg-accent/10 border-accent/20' : 'bg-danger/10 border-danger/20'

    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-dark via-primary to-secondary-dark flex items-center justify-center p-4">
        <div className="bg-white rounded-xl2 shadow-lift p-6 sm:p-10 max-w-md w-full text-center fade-up">
          <div className={`inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 mb-4 sm:mb-6 ${gradeBg}`}>
            <Award size={28} className={gradeColor} />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl text-ink mb-2">{result.percent.toFixed(1)}%</h1>
          <div className={`badge text-sm sm:text-base px-3 py-0.5 mb-4 ${gradeColor} ${gradeBg}`}>{grade}</div>

          {result.status === 'timed_out' && (
            <div className="p-3 rounded-xl bg-accent/10 border border-accent/20 text-sm text-accent-dark mb-4 flex items-center gap-2">
              <AlertTriangle size={16} /> Time expired — exam was auto-submitted
            </div>
          )}

          <div className="grid grid-cols-3 gap-2 sm:gap-4 my-4 sm:my-6 text-center">
            {[
              { label: 'Correct', value: result.correct, color: 'text-success' },
              { label: 'Wrong',   value: result.total - result.correct, color: 'text-danger' },
              { label: 'Total',   value: result.total, color: 'text-ink' },
            ].map(({ label, value, color }) => (
              <div key={label} className="p-2 sm:p-3 rounded-xl bg-surface border border-surface-border">
                <div className={`text-xl sm:text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-ink-muted">{label}</div>
              </div>
            ))}
          </div>

          <p className="text-sm text-ink-muted mb-4 sm:mb-6">
            Time taken: {Math.floor(result.timeTaken / 60)}m {result.timeTaken % 60}s
          </p>
          <button className="btn-primary w-full justify-center" onClick={() => navigate('/student')}>
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading || !q) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <Spinner size="lg" />
    </div>
  )

  // ── EXAM ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Sticky header */}
      <header className="sticky top-0 z-20 bg-white border-b border-surface-border shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-4">
          {/* Progress */}
          <div className="flex-1 min-w-0">
            <div className="flex justify-between text-xs text-ink-muted mb-1">
              <span className="hidden sm:inline">{answered} / {total} answered</span>
              <span className="sm:hidden">{answered}/{total}</span>
              <span>Q {current + 1}/{total}</span>
            </div>
            <div className="h-1.5 sm:h-2 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300"
                   style={{ width: `${progress}%` }} />
            </div>
          </div>

          {/* Timer */}
          <div className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl
                           font-mono font-semibold text-xs sm:text-sm flex-shrink-0
                           ${isUrgent ? 'bg-danger/10 text-danger timer-urgent' : 'bg-primary/10 text-primary'}`}>
            <Clock size={13} />
            {fmtTime(timeLeft)}
          </div>

          {/* Submit */}
          <button
            className="btn-accent text-xs sm:text-sm px-2 sm:px-4 py-1.5 sm:py-2 flex-shrink-0"
            onClick={() => {
              if (window.confirm(`Submit exam? You've answered ${answered}/${total} questions.`)) {
                handleSubmit(false)
              }
            }}
            disabled={submitting}>
            <Flag size={13} />
            <span className="hidden sm:inline">{submitting ? 'Submitting…' : 'Submit'}</span>
          </button>
        </div>
      </header>

      {/* Question */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-8">
        <div className="card mb-4 sm:mb-6 p-4 sm:p-6">
          <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <span className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary text-white text-sm font-bold flex items-center justify-center">
              {current + 1}
            </span>
            <p className="text-base sm:text-lg text-ink leading-relaxed font-medium">{q.question_text}</p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            {q.options.map(opt => {
              const selected = answers[q.id] === opt.label
              return (
                <button key={opt.label} onClick={() => handleAnswer(q.id, opt.label)}
                  className={`w-full flex items-center gap-3 p-3 sm:p-4 rounded-xl border text-left transition-all duration-150
                              ${selected ? 'border-primary bg-primary/10 shadow-glow' : 'border-surface-border hover:border-primary/40 hover:bg-primary/5'}`}>
                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
                                   ${selected ? 'border-primary bg-primary text-white' : 'border-ink-faint text-ink-muted'}`}>
                    {opt.label}
                  </div>
                  <span className={`text-sm ${selected ? 'text-primary font-medium' : 'text-ink'}`}>
                    {opt.text}
                  </span>
                  {selected && <CheckCircle size={16} className="text-primary ml-auto flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-2">
          <button className="btn-outline text-sm"
            onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          {/* Question dot navigator — scrollable on mobile */}
          <div className="flex gap-1 overflow-x-auto max-w-[200px] sm:max-w-xs py-1 scrollbar-none">
            {Array.from({ length: Math.min(total, 20) }, (_, i) => {
              const offset     = Math.max(0, Math.min(total - 20, current - 10))
              const idx        = i + offset
              const isAnswered = !!answers[questions[idx]?.id]
              const isCurrent  = idx === current
              return (
                <button key={idx} onClick={() => setCurrent(idx)}
                  className={`w-6 h-6 rounded-md text-xs font-medium flex-shrink-0 transition-colors
                              ${isCurrent ? 'bg-primary text-white' : isAnswered ? 'bg-success/20 text-success-dark' : 'bg-surface-border text-ink-muted hover:bg-ink-faint'}`}>
                  {idx + 1}
                </button>
              )
            })}
          </div>

          <button className="btn-primary text-sm"
            onClick={() => setCurrent(c => Math.min(total - 1, c + 1))} disabled={current === total - 1}>
            <span className="hidden sm:inline">Next</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
