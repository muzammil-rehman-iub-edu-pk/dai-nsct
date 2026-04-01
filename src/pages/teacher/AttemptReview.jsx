import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { TeacherLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { PageSpinner } from '../../components/ui/Spinner'
import { CheckCircle, XCircle, MinusCircle, ArrowLeft } from 'lucide-react'

export default function TeacherAttemptReview() {
  const { attemptId } = useParams()
  const navigate      = useNavigate()
  const [attempt,   setAttempt]   = useState(null)
  const [questions, setQuestions] = useState([])
  const loader = useApiCall()

  useEffect(() => { load() }, [attemptId])

  async function load() {
    await loader.run(async () => {
      const [att, snaps] = await Promise.all([
        dbQuery(supabase.from('exam_attempts')
          .select('*, students(student_name, reg_number)')
          .eq('id', attemptId).single()),
        dbQuery(supabase.from('exam_question_snapshots')
          .select('*').eq('attempt_id', attemptId).order('question_order')),
      ])
      setAttempt(att)
      setQuestions((snaps || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
      })))
    })
  }

  if (loader.loading) return <TeacherLayout><PageSpinner /></TeacherLayout>
  if (!attempt) return <TeacherLayout><p className="text-ink-muted p-4">Attempt not found.</p></TeacherLayout>

  const grade      = attempt.score_percent >= 80 ? 'Excellent' : attempt.score_percent >= 65 ? 'Good' : attempt.score_percent >= 50 ? 'Pass' : 'Fail'
  const gradeColor = attempt.score_percent >= 65 ? 'text-success-dark' : attempt.score_percent >= 50 ? 'text-accent-dark' : 'text-danger-dark'
  const student    = attempt.students

  return (
    <TeacherLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button className="btn-outline py-1.5 px-3 text-sm" onClick={() => navigate('/teacher/sections')}>
            <ArrowLeft size={15} /> Back
          </button>
          <div className="flex-1">
            <h1 className="page-title">Attempt Review</h1>
            {student && (
              <p className="text-ink-muted text-xs mt-0.5">
                {student.student_name} · {student.reg_number} · {new Date(attempt.started_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${gradeColor}`}>{attempt.score_percent?.toFixed(1)}%</div>
            <div className={`text-xs font-medium ${gradeColor}`}>{grade}</div>
          </div>
        </div>

        <div className="card mb-6 grid grid-cols-3 gap-4 text-center">
          {[
            { label: 'Correct', value: attempt.correct_answers,                          color: 'text-success'   },
            { label: 'Wrong',   value: attempt.total_questions - attempt.correct_answers, color: 'text-danger'    },
            { label: 'Skipped', value: questions.filter(q => !q.selected_label).length,  color: 'text-ink-muted' },
          ].map(({ label, value, color }) => (
            <div key={label}>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-ink-muted">{label}</div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          {questions.map((q, i) => {
            const correctOpt = q.options.find(o => o.is_correct)
            const skipped    = !q.selected_label
            return (
              <div key={q.id} className={`card border-l-4 ${skipped ? 'border-l-ink-faint' : q.is_correct ? 'border-l-success' : 'border-l-danger'}`}>
                <div className="flex items-start gap-3 mb-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-surface-border text-xs font-bold flex items-center justify-center text-ink-muted">{i + 1}</span>
                  <p className="text-sm sm:text-base text-ink font-medium leading-relaxed flex-1">{q.question_text}</p>
                  <div className="flex-shrink-0">
                    {skipped ? <MinusCircle size={18} className="text-ink-faint" /> : q.is_correct ? <CheckCircle size={18} className="text-success" /> : <XCircle size={18} className="text-danger" />}
                  </div>
                </div>
                <div className="space-y-2 ml-10">
                  {q.options.map(opt => {
                    const isCorrect  = opt.is_correct
                    const isSelected = opt.label === q.selected_label
                    const isWrong    = isSelected && !isCorrect
                    return (
                      <div key={opt.label} className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm border
                        ${isCorrect ? 'bg-success/10 border-success/30 text-success-dark font-medium' :
                          isWrong   ? 'bg-danger/10  border-danger/30  text-danger-dark'              :
                                      'border-transparent text-ink-muted'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isCorrect ? 'border-success bg-success text-white' : isWrong ? 'border-danger bg-danger text-white' : 'border-ink-faint text-ink-muted'}`}>
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

        <div className="mt-6 flex justify-center">
          <button className="btn-outline" onClick={() => navigate('/teacher/sections')}>
            <ArrowLeft size={15} /> Back to Sections
          </button>
        </div>
      </div>
    </TeacherLayout>
  )
}
