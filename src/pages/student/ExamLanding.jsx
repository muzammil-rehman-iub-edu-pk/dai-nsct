import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StudentLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { buildWeightedExam, prepareQuestion } from '../../lib/examEngine'
import { ClipboardList, Clock, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react'

export default function ExamLanding() {
  const { user } = useAuth()
  const navigate  = useNavigate()
  const [settings, setSettings] = useState(null)
  const [subjects, setSubjects] = useState([])
  const [student,  setStudent]  = useState(null)
  const [totalQ,   setTotalQ]   = useState(0)

  const loader  = useApiCall()
  const starter = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const [stu, cfg, subs, qCounts] = await Promise.all([
        dbQuery(supabase.from('students').select('id, student_name').eq('user_id', user.id).single()),
        dbQuery(supabase.from('exam_settings').select('*').single()),
        dbQuery(supabase.from('subjects').select('id, subject_name, weightage').eq('is_active', true)),
        dbQuery(supabase.from('questions').select('subject_id').eq('is_active', true)),
      ])
      setStudent(stu)
      setSettings(cfg)
      const counts = {}
      for (const q of qCounts || []) counts[q.subject_id] = (counts[q.subject_id] || 0) + 1
      const enriched = (subs || []).map(s => ({ ...s, questionCount: counts[s.id] || 0 }))
      setSubjects(enriched)
      setTotalQ(Object.values(counts).reduce((a, b) => a + b, 0))
    })
  }

  async function startExam() {
    try {
      await starter.run(async () => {
        const activeSubjectIds = subjects.map(s => s.id)
        if (!activeSubjectIds.length) throw new Error('No active subjects configured.')

        const questions = await dbQuery(
          supabase.from('questions').select('*')
            .in('subject_id', activeSubjectIds).eq('is_active', true)
        )
        if (!questions.length) throw new Error('No questions in the data bank.')

        const subjectGroups = subjects.map(s => ({
          subject_id: s.id, weightage: s.weightage,
          questions: questions.filter(q => q.subject_id === s.id)
        }))
        const selected = buildWeightedExam(subjectGroups, settings.total_questions)
        if (!selected.length) throw new Error('Could not generate exam. Check subject weightages.')

        const snapshots = selected.map((q, i) => prepareQuestion(q, i + 1))

        const attempt = await dbQuery(
          supabase.from('exam_attempts')
            .insert({ student_id: student.id, total_questions: snapshots.length, status: 'in_progress' })
            .select().single()
        )

        await dbQuery(
          supabase.from('exam_question_snapshots').insert(
            snapshots.map(s => ({
              attempt_id: attempt.id, question_id: s.question_id,
              question_text: s.question_text, options: s.options,
              question_order: s.question_order, selected_label: null, is_correct: null,
            }))
          )
        )

        navigate('/student/exam/room', { state: { attemptId: attempt.id, settings } })
      })
    } catch (err) {
      // error is available via starter.error
    }
  }

  if (loader.loading && !settings) return <StudentLayout><PageSpinner /></StudentLayout>

  const canStart = subjects.length > 0 && totalQ >= (settings?.total_questions || 100)

  return (
    <StudentLayout>
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="page-title">Take Exam</h1>
          <p className="text-ink-muted text-sm mt-1">Review the rules and start when ready</p>
        </div>

        <div className="card mb-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardList size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="font-display text-2xl text-ink">Competency Exam</h2>
              <p className="text-ink-muted text-sm">Dept. of AI - National Skills Competency Test</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2 text-primary mb-1"><HelpCircle size={16} /><span className="font-semibold text-sm">Questions</span></div>
              <div className="text-3xl font-bold text-ink">{settings?.total_questions}</div>
              <p className="text-xs text-ink-muted mt-1">Multiple Choice</p>
            </div>
            <div className="p-4 rounded-xl bg-secondary/5 border border-secondary/10">
              <div className="flex items-center gap-2 text-secondary mb-1"><Clock size={16} /><span className="font-semibold text-sm">Time Limit</span></div>
              <div className="text-3xl font-bold text-ink">{settings?.total_minutes}</div>
              <p className="text-xs text-ink-muted mt-1">Minutes</p>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2">Subject Distribution</h3>
            <div className="space-y-1.5">
              {subjects.map(s => {
                const totalW = subjects.reduce((sum, x) => sum + x.weightage, 0)
                const pct    = totalW > 0 ? (s.weightage / totalW) * 100 : 0
                const qCount = Math.round((pct / 100) * (settings?.total_questions || 100))
                return (
                  <div key={s.id} className="flex items-center gap-3">
                    <div className="w-28 text-xs text-ink-muted truncate">{s.subject_name}</div>
                    <div className="flex-1 h-2 rounded-full bg-surface-border overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-ink-muted w-16 text-right">~{qCount} Qs</div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-accent" /> Exam Rules
          </h3>
          <ul className="space-y-2 text-sm text-ink-muted">
            {[
              'Once started, the exam cannot be paused.',
              'The exam will auto-submit when the timer expires.',
              'Questions and options are randomized uniquely for you.',
              'You can navigate back and forward between questions.',
              'Results are displayed only after submission.',
              'Each attempt generates a fresh set of questions.',
            ].map((rule, i) => (
              <li key={i} className="flex items-start gap-2">
                <CheckCircle size={14} className="text-success mt-0.5 flex-shrink-0" />{rule}
              </li>
            ))}
          </ul>
        </div>

        {!canStart && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark mb-4 flex items-start gap-2">
            <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
            {subjects.length === 0
              ? 'No active subjects configured. Contact your administrator.'
              : `Only ${totalQ} questions available, but ${settings?.total_questions} required.`}
          </div>
        )}

        {starter.error && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark mb-4">
            {starter.error}
          </div>
        )}

        <button className="btn-primary w-full justify-center py-3 text-base"
          onClick={startExam} disabled={!canStart || starter.loading}>
          <ClipboardList size={18} />
          {starter.loading ? 'Generating your exam…' : 'Start Exam Now'}
        </button>
      </div>
    </StudentLayout>
  )
}
