import { useEffect, useState } from 'react'
import { StudentLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { Link } from 'react-router-dom'
import { ClipboardList, TrendingUp, Award, ChevronDown, ChevronUp } from 'lucide-react'

export default function StudentDashboard() {
  const { user } = useAuth()
  const [student, setStudent] = useState(null)
  const [attempts, setAttempts] = useState([])
  const [loading, setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: stu } = await supabase.from('students')
      .select('*, sections(section_name)').eq('user_id', user.id).single()
    setStudent(stu)

    if (stu) {
      const { data: atts } = await supabase.from('exam_attempts')
        .select('*').eq('student_id', stu.id)
        .neq('status', 'in_progress')
        .order('started_at', { ascending: false })
      setAttempts(atts || [])
    }
    setLoading(false)
  }

  if (loading) return <StudentLayout><PageSpinner /></StudentLayout>
  if (!student) return <StudentLayout><p className="text-ink-muted">Student profile not found.</p></StudentLayout>

  const completed = attempts.filter(a => a.status === 'completed')
  const avgScore  = completed.length
    ? completed.reduce((s, a) => s + a.score_percent, 0) / completed.length
    : 0
  const best = completed.length ? Math.max(...completed.map(a => a.score_percent)) : 0

  return (
    <StudentLayout>
      <div className="mb-6">
        <h1 className="page-title">Hello, {student.student_name} 👋</h1>
        <p className="text-ink-muted text-sm mt-1">
          {student.reg_number} · {student.sections?.section_name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Attempts', value: completed.length, icon: ClipboardList, color: 'text-primary bg-primary/10' },
          { label: 'Average Score',  value: `${avgScore.toFixed(1)}%`, icon: TrendingUp, color: 'text-secondary bg-secondary/10' },
          { label: 'Best Score',     value: `${best.toFixed(1)}%`, icon: Award, color: 'text-accent bg-accent/10' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-ink">{value}</div>
            <div className="text-xs text-ink-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Take exam CTA */}
      <div className="card mb-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-primary/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display text-xl text-ink">Ready for a new attempt?</h3>
            <p className="text-sm text-ink-muted mt-1">Each exam is uniquely generated with randomized questions.</p>
          </div>
          <Link to="/student/exam" className="btn-primary">
            <ClipboardList size={16} />
            Start Exam
          </Link>
        </div>
      </div>

      {/* Attempts history */}
      <div className="card">
        <h3 className="font-display text-lg text-ink mb-4">My Attempts</h3>
        {attempts.length === 0 ? (
          <div className="text-center py-10 text-ink-muted">
            <ClipboardList size={36} className="mx-auto mb-3 opacity-30" />
            <p>You haven't taken any exams yet.</p>
            <Link to="/student/exam" className="btn-primary mt-4 inline-flex">Take Your First Exam</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {attempts.map((a, i) => (
              <div key={a.id} className="border border-surface-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface text-left transition-colors"
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
                  <div className="border-t border-surface-border bg-surface px-4 py-3 grid grid-cols-3 gap-4 text-sm">
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
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </StudentLayout>
  )
}
