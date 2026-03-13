import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Info, Save } from 'lucide-react'

/**
 * SubjectWeightageForm
 *
 * Displays all active subjects with editable weightage fields.
 * Shows a live breakdown of how many exam questions each subject will produce.
 *
 * Props:
 *   totalQuestions  number  — from exam_settings
 *   onSave          () => void  — callback after successful save
 *   toast           fn  — from useToast
 */
export function SubjectWeightageForm({ totalQuestions = 100, onSave, toast }) {
  const [subjects, setSubjects] = useState([])
  const [weights, setWeights]   = useState({})   // { id: weightage string }
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('subjects')
      .select('id, subject_name, weightage, is_active')
      .order('subject_name')
    setSubjects(data || [])
    const w = {}
    for (const s of data || []) w[s.id] = String(s.weightage)
    setWeights(w)
    setLoading(false)
  }

  const activeSubjects = subjects.filter(s => s.is_active)
  const totalWeight    = activeSubjects.reduce((sum, s) => sum + (parseFloat(weights[s.id]) || 0), 0)

  function qCount(subjectId) {
    if (!totalWeight) return 0
    const w = parseFloat(weights[subjectId]) || 0
    return Math.round((w / totalWeight) * totalQuestions)
  }

  async function handleSave() {
    // Validate
    for (const s of activeSubjects) {
      const v = parseFloat(weights[s.id])
      if (isNaN(v) || v <= 0) {
        toast?.(`Weightage for "${s.subject_name}" must be > 0`, 'error')
        return
      }
    }

    setSaving(true)
    try {
      await Promise.all(
        subjects.map(s =>
          supabase.from('subjects')
            .update({ weightage: parseFloat(weights[s.id]) || s.weightage, updated_at: new Date().toISOString() })
            .eq('id', s.id)
        )
      )
      toast?.('Weightages saved!', 'success')
      onSave?.()
    } catch (err) {
      toast?.(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-ink-muted">Loading subjects…</p>

  return (
    <div className="flex flex-col gap-4">
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex items-start gap-2 text-sm text-ink-muted">
        <Info size={15} className="text-primary flex-shrink-0 mt-0.5" />
        <span>
          Weightage is relative. E.g. Math=30, English=20 means Math gets
          {' '}<strong className="text-ink">60%</strong> and English gets{' '}
          <strong className="text-ink">40%</strong> of {totalQuestions} questions.
          Inactive subjects are excluded from exams.
        </span>
      </div>

      <div className="space-y-2">
        {subjects.map(s => (
          <div key={s.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                        ${s.is_active ? 'border-surface-border' : 'border-surface-border bg-surface opacity-60'}`}>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{s.subject_name}</div>
              {s.is_active && totalWeight > 0 && (
                <div className="text-xs text-ink-muted">
                  ≈ {qCount(s.id)} questions ({((parseFloat(weights[s.id]) / totalWeight) * 100).toFixed(1)}%)
                </div>
              )}
              {!s.is_active && (
                <div className="text-xs text-danger">Inactive — excluded from exams</div>
              )}
            </div>
            <div className="w-28">
              <input
                type="number"
                min="0.5"
                max="100"
                step="0.5"
                className="form-input text-center"
                value={weights[s.id] ?? ''}
                onChange={e => setWeights(w => ({ ...w, [s.id]: e.target.value }))}
                disabled={!s.is_active}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <span className="text-xs text-ink-muted">
          Total weight: <strong className="text-ink">{totalWeight.toFixed(1)}</strong>
        </span>
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={14} />
          {saving ? 'Saving…' : 'Save Weightages'}
        </button>
      </div>
    </div>
  )
}
