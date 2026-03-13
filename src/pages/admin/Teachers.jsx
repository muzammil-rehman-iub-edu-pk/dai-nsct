import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { createTeacherUser } from '../../lib/adminApi'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { useToast } from '../../hooks/useToast'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, UserCheck } from 'lucide-react'

const emptyForm = { teacher_name: '', designation: '', expertise: '', email: '', password: '' }

export default function AdminTeachers() {
  const [teachers, setTeachers] = useState([])
  const [loading, setLoading]   = useState(true)
  const [modalOpen, setModal]   = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [confirm, setConfirm]   = useState(null)
  const [search, setSearch]     = useState('')
  const [saving, setSaving]     = useState(false)
  const { toasts, toast, dismiss } = useToast()

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('teachers')
      .select('*, user_profiles(is_active)')
      .order('teacher_name')
    if (error) toast(error.message, 'error')
    setTeachers(data || [])
    setLoading(false)
  }

  function openAdd() { setForm(emptyForm); setEditRow(null); setModal(true) }
  function openEdit(t) {
    setForm({ teacher_name: t.teacher_name, designation: t.designation || '',
              expertise: t.expertise || '', email: t.email, password: '' })
    setEditRow(t); setModal(true)
  }

  async function handleSave() {
    if (!form.teacher_name.trim() || !form.email.trim()) {
      toast('Name and email are required', 'error'); return
    }
    if (!editRow && form.password.length < 8) {
      toast('Password must be at least 8 characters', 'error'); return
    }
    setSaving(true)
    try {
      if (editRow) {
        const { error } = await supabase.from('teachers').update({
          teacher_name: form.teacher_name.trim(),
          designation:  form.designation.trim() || null,
          expertise:    form.expertise.trim()   || null,
          updated_at:   new Date().toISOString(),
        }).eq('id', editRow.id)
        if (error) throw error
        toast('Teacher updated', 'success')
      } else {
        await createTeacherUser({
          email:        form.email.trim().toLowerCase(),
          password:     form.password,
          teacher_name: form.teacher_name.trim(),
          designation:  form.designation.trim() || null,
          expertise:    form.expertise.trim()   || null,
        })
        toast('Teacher created — they can now log in', 'success')
      }
      setModal(false); load()
    } catch (err) {
      toast(err.message, 'error')
    } finally { setSaving(false) }
  }

  async function toggleActive(t) {
    const newActive = !t.is_active
    await supabase.from('teachers').update({ is_active: newActive }).eq('id', t.id)
    if (t.user_id) await supabase.from('user_profiles').update({ is_active: newActive }).eq('id', t.user_id)
    toast(newActive ? 'Teacher activated' : 'Teacher deactivated', 'success')
    load()
  }

  async function deleteTeacher(t) {
    await supabase.from('teachers').delete().eq('id', t.id)
    toast('Teacher deleted', 'success'); load()
  }

  const filtered = teachers.filter(t =>
    t.teacher_name.toLowerCase().includes(search.toLowerCase()) ||
    t.email.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="text-ink-muted text-sm mt-1">{teachers.length} total</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Teacher</button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="form-input pl-9" placeholder="Search teachers…"
               value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th>Teacher</th><th>Designation</th><th>Expertise</th>
              <th>Email</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(t => (
              <tr key={t.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-sm">
                      {t.teacher_name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-ink">{t.teacher_name}</span>
                  </div>
                </td>
                <td className="text-ink-muted">{t.designation || '—'}</td>
                <td className="text-ink-muted">{t.expertise || '—'}</td>
                <td className="text-ink-muted font-mono text-xs">{t.email}</td>
                <td><span className={`badge ${t.is_active ? 'badge-success' : 'badge-danger'}`}>{t.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
                    <button className="btn-ghost p-1.5" onClick={() => toggleActive(t)}>
                      {t.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-ink-faint" />}
                    </button>
                    <button className="btn-ghost p-1.5 text-danger"
                      onClick={() => setConfirm({ action: () => deleteTeacher(t), msg: `Delete "${t.teacher_name}"?` })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr><td colSpan={6} className="text-center py-10 text-ink-muted">
                <UserCheck size={32} className="mx-auto mb-2 opacity-30" />No teachers found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editRow ? 'Edit Teacher' : 'Add Teacher'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Teacher Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.teacher_name}
                   onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} placeholder="Full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Designation</label>
              <input className="form-input" value={form.designation}
                     onChange={e => setForm(f => ({ ...f, designation: e.target.value }))} placeholder="e.g. Lecturer" />
            </div>
            <div>
              <label className="form-label">Expertise</label>
              <input className="form-input" value={form.expertise}
                     onChange={e => setForm(f => ({ ...f, expertise: e.target.value }))} placeholder="e.g. Mathematics" />
            </div>
          </div>
          {!editRow && (
            <>
              <div>
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input className="form-input" type="email" value={form.email}
                       onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="teacher@school.edu" />
              </div>
              <div>
                <label className="form-label">Temporary Password <span className="text-danger">*</span></label>
                <input className="form-input" type="password" value={form.password}
                       onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
                <p className="text-xs text-ink-muted mt-1">Teacher will be forced to change this on first login.</p>
              </div>
            </>
          )}
          {editRow && (
            <p className="text-sm text-ink-muted p-3 rounded-xl bg-surface border border-surface-border">
              To reset a password, the teacher uses Settings after logging in.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : editRow ? 'Update' : 'Create Teacher'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}