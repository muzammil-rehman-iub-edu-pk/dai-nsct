import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { PageSpinner } from '../../components/ui/Spinner'
import { Users, UserCheck, BookOpen, School, ClipboardList, Database, TrendingUp, Award } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null)
  const [topStudents, setTop]   = useState([])
  const [byTeacher, setByTeacher] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const [
      { count: teacherCount },
      { count: studentCount },
      { count: sectionCount },
      { count: subjectCount },
      { count: questionCount },
      { count: attemptCount },
      { data: attempts },
      { data: teachers },
    ] = await Promise.all([
      supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('students').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('sections').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('subjects').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('questions').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('exam_attempts').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('exam_attempts')
        .select('student_id, score_percent, students(student_name, reg_number, sections(section_name))')
        .eq('status', 'completed').order('score_percent', { ascending: false }).limit(50),
      supabase.from('teachers')
        .select('id, teacher_name, sections(id, section_name, students(id, exam_attempts(score_percent, status)))')
        .eq('is_active', true),
    ])

    setStats({ teacherCount, studentCount, sectionCount, subjectCount, questionCount, attemptCount })

    // Top students by average score
    const studentMap = {}
    for (const a of attempts || []) {
      const key = a.student_id
      if (!studentMap[key]) studentMap[key] = { ...a.students, attempts: [], id: key }
      studentMap[key].attempts.push(a.score_percent)
    }
    const ranked = Object.values(studentMap).map(s => ({
      ...s,
      avg: s.attempts.reduce((x, y) => x + y, 0) / s.attempts.length,
      count: s.attempts.length,
    })).sort((a, b) => b.avg - a.avg).slice(0, 10)
    setTop(ranked)

    // By teacher
    const teacherStats = (teachers || []).map(t => {
      const allAttempts = t.sections.flatMap(sec =>
        sec.students.flatMap(stu => stu.exam_attempts.filter(a => a.status === 'completed'))
      )
      const avg = allAttempts.length
        ? allAttempts.reduce((s, a) => s + a.score_percent, 0) / allAttempts.length
        : 0
      return {
        id: t.id,
        name: t.teacher_name,
        sectionCount: t.sections.length,
        studentCount: t.sections.reduce((s, sec) => s + sec.students.length, 0),
        attemptCount: allAttempts.length,
        avgScore: Math.round(avg * 100) / 100,
      }
    })
    setByTeacher(teacherStats)
    setLoading(false)
  }

  const statCards = [
    { label: 'Teachers',   value: stats?.teacherCount,  icon: UserCheck,    color: 'text-secondary bg-secondary/10' },
    { label: 'Students',   value: stats?.studentCount,  icon: Users,        color: 'text-primary bg-primary/10'   },
    { label: 'Sections',   value: stats?.sectionCount,  icon: School,       color: 'text-success bg-success/10'   },
    { label: 'Subjects',   value: stats?.subjectCount,  icon: BookOpen,     color: 'text-accent bg-accent/10'     },
    { label: 'Questions',  value: stats?.questionCount, icon: Database,     color: 'text-secondary bg-secondary/10' },
    { label: 'Attempts',   value: stats?.attemptCount,  icon: ClipboardList,color: 'text-primary bg-primary/10'   },
  ]

  if (loading) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="page-title">Dashboard</h1>
        <p className="text-ink-muted text-sm mt-1">System overview and performance metrics</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card p-4">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
              <Icon size={18} />
            </div>
            <div className="text-2xl font-bold text-ink">{value ?? '…'}</div>
            <div className="text-xs text-ink-muted mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher performance */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={18} className="text-secondary" />
            <h3 className="font-display text-lg text-ink">Performance by Teacher</h3>
          </div>
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Teacher</th>
                  <th>Sections</th>
                  <th>Students</th>
                  <th>Attempts</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {byTeacher.map(t => (
                  <tr key={t.id}>
                    <td className="font-medium text-ink">{t.name}</td>
                    <td>{t.sectionCount}</td>
                    <td>{t.studentCount}</td>
                    <td>{t.attemptCount}</td>
                    <td>
                      <span className={`badge ${t.avgScore >= 70 ? 'badge-success' : t.avgScore >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                        {t.avgScore.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!byTeacher.length && (
                  <tr><td colSpan={5} className="text-center text-ink-muted py-6">No data yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top students */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Award size={18} className="text-accent" />
            <h3 className="font-display text-lg text-ink">Top Students</h3>
          </div>
          <div className="table-wrap">
            <table className="table-base">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Section</th>
                  <th>Attempts</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {topStudents.map((s, i) => (
                  <tr key={s.id}>
                    <td className="text-ink-faint font-mono text-xs">{i + 1}</td>
                    <td>
                      <div className="font-medium text-ink">{s.student_name}</div>
                      <div className="text-xs text-ink-muted">{s.reg_number}</div>
                    </td>
                    <td className="text-xs text-ink-muted">{s.sections?.section_name}</td>
                    <td>{s.count}</td>
                    <td>
                      <span className={`badge ${s.avg >= 70 ? 'badge-success' : s.avg >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                        {s.avg.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
                {!topStudents.length && (
                  <tr><td colSpan={5} className="text-center text-ink-muted py-6">No attempts yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
