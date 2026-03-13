import { useEffect, useState } from 'react'
import { TeacherLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { ChevronDown, ChevronUp, Users } from 'lucide-react'

export default function TeacherSectionProgress() {
  const { user } = useAuth()
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState({})  // {studentId: bool}
  const [selSection, setSelSec] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const { data: teacher } = await supabase.from('teachers')
      .select('id').eq('user_id', user.id).single()
    if (!teacher) { setLoading(false); return }

    const { data: secs } = await supabase.from('sections')
      .select(`
        id, section_name,
        students (
          id, student_name, reg_number,
          exam_attempts (
            id, started_at, submitted_at, score_percent, correct_answers, total_questions, status, time_taken_secs
          )
        )
      `)
      .eq('teacher_id', teacher.id)
      .order('section_name')

    // Sort attempts by date desc for each student
    const processed = (secs || []).map(sec => ({
      ...sec,
      students: sec.students.map(stu => ({
        ...stu,
        attempts: [...(stu.exam_attempts || [])].filter(a => a.status !== 'in_progress')
          .sort((a, b) => new Date(b.started_at) - new Date(a.started_at)),
        avg: stu.exam_attempts.filter(a => a.status === 'completed').length
          ? stu.exam_attempts.filter(a => a.status === 'completed')
              .reduce((s, a) => s + a.score_percent, 0) /
            stu.exam_attempts.filter(a => a.status === 'completed').length
          : 0
      }))
    }))

    setSections(processed)
    if (processed.length) setSelSec(processed[0].id)
    setLoading(false)
  }

  const currentSection = sections.find(s => s.id === selSection)

  function toggleExpand(studentId) {
    setExpanded(e => ({ ...e, [studentId]: !e[studentId] }))
  }

  function formatTime(secs) {
    if (!secs) return '—'
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  if (loading) return <TeacherLayout><PageSpinner /></TeacherLayout>

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="page-title">Section Progress</h1>
        <p className="text-ink-muted text-sm mt-1">View student attempts and scores by section</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
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
              <Users size={18} className="text-secondary" />
              {currentSection.section_name}
            </h3>
            <span className="badge badge-primary">{currentSection.students.length} students</span>
          </div>

          <div className="space-y-2">
            {currentSection.students.map(stu => (
              <div key={stu.id} className="border border-surface-border rounded-xl overflow-hidden">
                {/* Student row */}
                <button
                  className="w-full flex items-center gap-4 px-4 py-3 hover:bg-surface transition-colors text-left"
                  onClick={() => toggleExpand(stu.id)}>
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm flex-shrink-0">
                    {stu.student_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink">{stu.student_name}</div>
                    <div className="text-xs text-ink-muted">{stu.reg_number}</div>
                  </div>
                  <div className="text-sm text-ink-muted">{stu.attempts.length} attempts</div>
                  <div>
                    {stu.attempts.length > 0 ? (
                      <span className={`badge ${stu.avg >= 70 ? 'badge-success' : stu.avg >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                        Avg {stu.avg.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="badge badge-muted">No attempts</span>
                    )}
                  </div>
                  {expanded[stu.id] ? <ChevronUp size={16} className="text-ink-faint" /> : <ChevronDown size={16} className="text-ink-faint" />}
                </button>

                {/* Expanded attempts */}
                {expanded[stu.id] && (
                  <div className="border-t border-surface-border bg-surface px-4 py-3">
                    {stu.attempts.length === 0 ? (
                      <p className="text-sm text-ink-muted py-2">No completed attempts yet.</p>
                    ) : (
                      <table className="table-base">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Date</th>
                            <th>Score</th>
                            <th>Correct</th>
                            <th>Time Taken</th>
                            <th>Status</th>
                          </tr>
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
    </TeacherLayout>
  )
}
