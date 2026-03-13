import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, FlaskConical, Info } from 'lucide-react'

export default function AdminSubjects() {
  const [subjects, setSubjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModal]   = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState({ subject_name: '', description: '', weightage: '10' })
  const [confirm, setConfirm]   = useState(null)
  const [saving, setSaving]     = useState(false)
  const [qCounts, setQCounts]   = useState({})
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: subs }, { data: qc }] = await Promise.all([
      supabase.from('subjects').select('*').order('subject_name'),
      supabase.from('questions').select('subject_id').eq('is_active', true),
    ])
    setSubjects(subs || [])
    // Count questions per subject
    const counts = {}
    for (const q of qc || []) {
      counts[q.subject_id] = (counts[q.subject_id] || 0) + 1
    }
    setQCounts(counts)
    setLoading(false)
  }

  function openAdd() { setForm({ subject_name: '', description: '', weightage: '10' }); setEditRow(null); setModal(true) }
  function openEdit(s) {
    setForm({ subject_name: s.subject_name, description: s.description || '', weightage: String(s.weightage) })
    setEditRow(s); setModal(true)
  }

  async function handleSave() {
    if (!form.subject_name.trim()) { toast('Subject name is required', 'error'); return }
    const w = parseFloat(form.weightage)
    if (isNaN(w) || w <= 0 || w > 100) { toast('Weightage must be 1–100', 'error'); return }

    setSaving(true)
    try {
      const payload = { subject_name: form.subject_name.trim(), description: form.description, weightage: w, updated_at: new Date().toISOString() }
      if (editRow) {
        await supabase.from('subjects').update(payload).eq('id', editRow.id)
        toast('Subject updated', 'success')
      } else {
        await supabase.from('subjects').insert(payload)
        toast('Subject created', 'success')
      }
      setModal(false); load()
    } catch (err) { toast(err.message, 'error') }
    finally { setSaving(false) }
  }

  async function toggleActive(s) {
    await supabase.from('subjects').update({ is_active: !s.is_active }).eq('id', s.id)
    toast(!s.is_active ? 'Subject activated' : 'Subject deactivated', 'success')
    load()
  }

  async function deleteSubject(s) {
    await supabase.from('subjects').delete().eq('id', s.id)
    toast('Subject deleted', 'success'); load()
  }

  // Total weightage of active subjects
  const totalWeight = subjects.filter(s => s.is_active).reduce((sum, s) => sum + parseFloat(s.weightage), 0)

  if (loading) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-ink-muted text-sm mt-1">{subjects.length} subjects</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Subject</button>
      </div>

      {/* Weightage summary */}
      <div className="card mb-6 flex items-center gap-3 p-4">
        <Info size={18} className="text-primary flex-shrink-0" />
        <div className="text-sm text-ink-muted">
          Total active weightage: <strong className="text-ink">{totalWeight.toFixed(1)}</strong>
          {' '}— questions are distributed proportionally to this when generating exams.
          Inactive subjects are excluded from exams entirely.
        </div>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>Subject</th>
              <th>Description</th>
              <th>Weightage</th>
              <th>Questions</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map(s => {
              const qCount = qCounts[s.id] || 0
              const pct = totalWeight > 0 ? ((s.weightage / totalWeight) * 100).toFixed(1) : 0
              return (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                        <FlaskConical size={14} className="text-accent-dark" />
                      </div>
                      <span className="font-medium text-ink">{s.subject_name}</span>
                    </div>
                  </td>
                  <td className="text-ink-muted text-sm max-w-xs truncate">{s.description || '—'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-ink">{s.weightage}</span>
                      {s.is_active && <span className="text-xs text-ink-muted">({pct}%)</span>}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${qCount > 0 ? 'badge-success' : 'badge-danger'}`}>
                      {qCount} Qs
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${s.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                      <button className="btn-ghost p-1.5" onClick={() => toggleActive(s)}>
                        {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} />}
                      </button>
                      <button className="btn-ghost p-1.5 text-danger"
                        onClick={() => setConfirm({ action: () => deleteSubject(s), msg: `Delete "${s.subject_name}" and all its questions?` })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)}
             title={editRow ? 'Edit Subject' : 'Add Subject'} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Subject Name *</label>
            <input className="form-input" value={form.subject_name}
                   onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Weightage *</label>
            <input className="form-input" type="number" min="1" max="100" step="0.5" value={form.weightage}
                   onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} />
            <p className="text-xs text-ink-muted mt-1">
              Relative weight for exam question allocation. E.g. Math=30, English=20, Science=50 means 30%, 20%, 50% of questions.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editRow ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
