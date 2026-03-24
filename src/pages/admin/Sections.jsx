import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, School } from 'lucide-react'

export default function AdminSections() {
  const [sections, setSections] = useState([])
  const [teachers, setTeachers] = useState([])
  const [modalOpen, setModal]   = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState({ section_name: '', teacher_id: '' })
  const [confirm, setConfirm]   = useState(null)

  const { toasts, toast, dismiss } = useToast()
  const loader  = useApiCall()
  const saver   = useApiCall()
  const mutator = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const [secs, tchs] = await Promise.all([
        dbQuery(supabase.from('sections').select('*, teachers(teacher_name)').order('section_name')),
        dbQuery(supabase.from('teachers').select('id, teacher_name').eq('is_active', true).order('teacher_name')),
      ])
      setSections(secs || [])
      setTeachers(tchs || [])
    })
  }

  function openAdd()  { setForm({ section_name: '', teacher_id: '' }); setEditRow(null); setModal(true) }
  function openEdit(s) {
    setForm({ section_name: s.section_name, teacher_id: s.teacher_id || '' })
    setEditRow(s); setModal(true)
  }

  async function handleSave() {
    if (!form.section_name.trim()) { toast('Section name is required', 'error'); return }
    try {
      await saver.run(async () => {
        const payload = { section_name: form.section_name.trim(), teacher_id: form.teacher_id || null }
        if (editRow) {
          await dbQuery(supabase.from('sections').update(payload).eq('id', editRow.id))
          toast('Section updated', 'success')
        } else {
          await dbQuery(supabase.from('sections').insert(payload))
          toast('Section created', 'success')
        }
      })
      setModal(false)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function toggleActive(s) {
    try {
      await mutator.run(() =>
        dbQuery(supabase.from('sections').update({ is_active: !s.is_active }).eq('id', s.id))
      )
      toast(!s.is_active ? 'Section activated' : 'Section deactivated', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function deleteSection(s) {
    try {
      await mutator.run(() =>
        dbQuery(supabase.from('sections').delete().eq('id', s.id))
      )
      toast('Section deleted', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  if (loader.loading && !sections.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Sections</h1>
          <p className="text-ink-muted text-sm mt-1">{sections.length} sections</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Section</button>
      </div>

      <div className="card-grid">
        {sections.map(s => (
          <div key={s.id} className="card flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <School size={18} className="text-success-dark" />
                </div>
                <div>
                  <div className="font-semibold text-ink">{s.section_name}</div>
                  <div className="text-xs text-ink-muted">{s.teachers?.teacher_name || 'No teacher assigned'}</div>
                </div>
              </div>
              <span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>
                {s.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="flex items-center gap-1 justify-end pt-1 border-t border-surface-border">
              <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
              <button className="btn-ghost p-1.5" onClick={() => toggleActive(s)} disabled={mutator.loading}>
                {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} />}
              </button>
              <button className="btn-ghost p-1.5 text-danger"
                onClick={() => setConfirm({ action: () => deleteSection(s), msg: `Delete section "${s.section_name}"?` })}>
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        {!sections.length && !loader.loading && (
          <div className="col-span-3 text-center py-16 text-ink-muted">
            <School size={40} className="mx-auto mb-3 opacity-30" />
            <p>No sections yet. Add your first section.</p>
          </div>
        )}
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)}
             title={editRow ? 'Edit Section' : 'Add Section'} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Section Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.section_name}
                   onChange={e => setForm(f => ({ ...f, section_name: e.target.value }))}
                   placeholder="e.g. Section A, Batch 2024" autoFocus />
          </div>
          <div>
            <label className="form-label">Assign Teacher</label>
            <select className="form-input" value={form.teacher_id}
                    onChange={e => setForm(f => ({ ...f, teacher_id: e.target.value }))}>
              <option value="">-- No Teacher --</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.teacher_name}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              {saver.loading ? 'Saving…' : editRow ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
