import { useEffect, useState } from 'react'
import { TeacherLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../../components/ui/Spinner'
import { TrendingUp, Users, ClipboardList, Award } from 'lucide-react'

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const loader = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const teacher = await dbQuery(
        supabase.from('teachers').select('id, teacher_name').eq('user_id', user.id).single()
      )
      const sections = await dbQuery(
        supabase.from('sections')
          .select('id, section_name, students(id, student_name, exam_attempts(score_percent, status))')
          .eq('teacher_id', teacher.id)
      )
      const allAttempts = (sections || []).flatMap(sec =>
        sec.students.flatMap(stu => stu.exam_attempts.filter(a => a.status === 'completed'))
      )
      const avgScore = allAttempts.length
        ? allAttempts.reduce((s, a) => s + a.score_percent, 0) / allAttempts.length : 0
      setData({ teacher, sections: sections || [], allAttempts, avgScore })
    })
  }

  if (loader.loading && !data) return <TeacherLayout><PageSpinner /></TeacherLayout>
  if (!data) return <TeacherLayout><p className="text-ink-muted">Teacher profile not found.</p></TeacherLayout>

  const totalStudents = data.sections.reduce((s, sec) => s + sec.students.length, 0)

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="page-title">Welcome, {data.teacher.teacher_name}</h1>
        <p className="text-ink-muted text-sm mt-1">Your teaching overview</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'My Sections',    value: data.sections.length,          icon: ClipboardList, color: 'text-secondary bg-secondary/10' },
          { label: 'Total Students', value: totalStudents,                  icon: Users,         color: 'text-primary bg-primary/10'    },
          { label: 'Total Attempts', value: data.allAttempts.length,        icon: TrendingUp,    color: 'text-success bg-success/10'    },
          { label: 'Avg Score',      value: `${data.avgScore.toFixed(1)}%`, icon: Award,         color: 'text-accent bg-accent/10'      },
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

      <div className="card">
        <h3 className="font-display text-lg text-ink mb-4">Sections Overview</h3>
        <div className="space-y-3">
          {data.sections.map(sec => {
            const attempts = sec.students.flatMap(s => s.exam_attempts.filter(a => a.status === 'completed'))
            const avg = attempts.length ? attempts.reduce((s, a) => s + a.score_percent, 0) / attempts.length : 0
            return (
              <div key={sec.id} className="flex items-center justify-between p-3 rounded-xl bg-surface border border-surface-border">
                <div>
                  <div className="font-medium text-ink">{sec.section_name}</div>
                  <div className="text-xs text-ink-muted">{sec.students.length} students · {attempts.length} attempts</div>
                </div>
                <span className={`badge ${avg >= 70 ? 'badge-success' : avg >= 50 ? 'badge-accent' : 'badge-danger'}`}>
                  {avg.toFixed(1)}% avg
                </span>
              </div>
            )
          })}
          {!data.sections.length && <p className="text-ink-muted text-sm">No sections assigned yet.</p>}
        </div>
      </div>
    </TeacherLayout>
  )
}
