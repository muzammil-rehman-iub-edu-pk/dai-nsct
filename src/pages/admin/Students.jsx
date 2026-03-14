import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { createStudentUser } from '../../lib/adminApi'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, GraduationCap } from 'lucide-react'

const emptyForm = { reg_number: '', student_name: '', father_name: '', section_id: '', email: '', password: '' }

export default function AdminStudents() {
  const [students, setStudents] = useState([])
  const [sections, setSections] = useState([])
  const [modalOpen, setModal]   = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [confirm, setConfirm]   = useState(null)
  const [search, setSearch]     = useState('')

  const { toasts, toast, dismiss } = useToast()
  const loader  = useApiCall()
  const saver   = useApiCall()
  const mutator = useApiCall()

  useEffect(() => { load() }, [])

  async function load() {
    await loader.run(async () => {
      const [studs, secs] = await Promise.all([
        dbQuery(supabase.from('students').select('*, sections(section_name)').order('student_name')),
        dbQuery(supabase.from('sections').select('id, section_name').eq('is_active', true).order('section_name')),
      ])
      setStudents(studs || [])
      setSections(secs || [])
    })
  }

  function openAdd()   { setForm(emptyForm); setEditRow(null); setModal(true) }
  function openEdit(s) {
    setForm({ reg_number: s.reg_number, student_name: s.student_name, father_name: s.father_name,
              section_id: s.section_id, email: s.email, password: '' })
    setEditRow(s); setModal(true)
  }

  async function handleSave() {
    const { reg_number, student_name, father_name, section_id, email, password } = form
    if (!reg_number || !student_name || !father_name || !section_id || !email) {
      toast('All fields except password are required', 'error'); return
    }
    if (!editRow && password.length < 8) {
      toast('Password must be at least 8 characters', 'error'); return
    }
    try {
      await saver.run(async () => {
        if (editRow) {
          await dbQuery(supabase.from('students').update({
            student_name, father_name, section_id, updated_at: new Date().toISOString()
          }).eq('id', editRow.id))
          toast('Student updated', 'success')
        } else {
          await createStudentUser({
            email: email.trim().toLowerCase(), password,
            student_name: student_name.trim(),
            father_name: father_name.trim(),
            reg_number: reg_number.trim(), section_id,
          })
          toast('Student created — they can now log in', 'success')
        }
      })
      setModal(false)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function toggleActive(s) {
    const newActive = !s.is_active
    try {
      await mutator.run(async () => {
        await dbQuery(supabase.from('students').update({ is_active: newActive }).eq('id', s.id))
        if (s.user_id) {
          await dbQuery(supabase.from('user_profiles').update({ is_active: newActive }).eq('id', s.user_id))
        }
      })
      toast(newActive ? 'Student activated' : 'Student deactivated', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function deleteStudent(s) {
    try {
      await mutator.run(() => dbQuery(supabase.from('students').delete().eq('id', s.id)))
      toast('Student deleted', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const filtered = students.filter(s =>
    s.student_name.toLowerCase().includes(search.toLowerCase()) ||
    s.reg_number.toLowerCase().includes(search.toLowerCase())
  )

  if (loader.loading && !students.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-ink-muted text-sm mt-1">{students.length} enrolled</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Student</button>
      </div>

      <div className="relative mb-4 max-w-xs">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input className="form-input pl-9" placeholder="Search by name or reg#…"
               value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr><th>Reg #</th><th>Student</th><th>Father Name</th><th>Section</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-ink-muted">{s.reg_number}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {s.student_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-ink">{s.student_name}</div>
                      <div className="text-xs text-ink-muted">{s.email}</div>
                    </div>
                  </div>
                </td>
                <td className="text-ink-muted">{s.father_name}</td>
                <td><span className="badge badge-primary">{s.sections?.section_name}</span></td>
                <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <div className="flex items-center gap-1">
                    <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                    <button className="btn-ghost p-1.5" onClick={() => toggleActive(s)} disabled={mutator.loading}>
                      {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-ink-faint" />}
                    </button>
                    <button className="btn-ghost p-1.5 text-danger"
                      onClick={() => setConfirm({ action: () => deleteStudent(s), msg: `Delete "${s.student_name}"?` })}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && !loader.loading && (
              <tr><td colSpan={6} className="text-center py-10 text-ink-muted">
                <GraduationCap size={32} className="mx-auto mb-2 opacity-30" />No students found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)} title={editRow ? 'Edit Student' : 'Add Student'}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Registration No. <span className="text-danger">*</span></label>
              <input className="form-input" value={form.reg_number} disabled={!!editRow} autoFocus
                     onChange={e => setForm(f => ({ ...f, reg_number: e.target.value }))} />
            </div>
            <div>
              <label className="form-label">Section <span className="text-danger">*</span></label>
              <select className="form-input" value={form.section_id}
                      onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}>
                <option value="">-- Select Section --</option>
                {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.section_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Student Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.student_name}
                   onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Father Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.father_name}
                   onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
          </div>
          {!editRow && (
            <>
              <div>
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input className="form-input" type="email" value={form.email}
                       onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div>
                <label className="form-label">Temporary Password <span className="text-danger">*</span></label>
                <input className="form-input" type="password" value={form.password}
                       onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" />
                <p className="text-xs text-ink-muted mt-1">Student will be forced to change this on first login.</p>
              </div>
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              {saver.loading ? 'Saving…' : editRow ? 'Update' : 'Create Student'}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
