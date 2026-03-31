import { useEffect, useRef, useState } from 'react'
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
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, GraduationCap, Upload, X, CheckCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const emptyForm = { reg_number: '', student_name: '', father_name: '', section_id: '', email: '', password: '' }

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    const fields = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { fields.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    fields.push(cur.trim())
    return Object.fromEntries(headers.map((h, i) => [h, fields[i] || '']))
  }).filter(r => Object.values(r).some(v => v))
  return { headers, rows }
}

const STUDENT_REQUIRED = ['reg_number', 'student_name', 'father_name', 'section_name', 'email', 'password']

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ open, onClose, onDone, sections }) {
  const [rows,     setRows]     = useState([])
  const [errors,   setErrors]   = useState([])
  const [progress, setProgress] = useState(null)
  const [running,  setRunning]  = useState(false)
  const fileRef = useRef()

  const sectionMap = Object.fromEntries(
    sections.map(s => [s.section_name.toLowerCase().trim(), s.id])
  )

  useEffect(() => {
    if (open) { setRows([]); setErrors([]); setProgress(null); setRunning(false) }
  }, [open])

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => parseFile(ev.target.result)
    reader.readAsText(file)
  }

  function parseFile(text) {
    const { headers, rows: parsed } = parseCSV(text)
    const missing = STUDENT_REQUIRED.filter(f => !headers.includes(f))
    if (missing.length) {
      setErrors([`Missing required columns: ${missing.join(', ')}`])
      setRows([])
      return
    }
    const errs = []
    parsed.forEach((r, i) => {
      const n = i + 2
      if (!r.reg_number?.trim())   errs.push(`Row ${n}: reg_number is required`)
      if (!r.student_name?.trim()) errs.push(`Row ${n}: student_name is required`)
      if (!r.father_name?.trim())  errs.push(`Row ${n}: father_name is required`)
      if (!r.email?.trim())        errs.push(`Row ${n}: email is required`)
      if (!r.password?.trim())     errs.push(`Row ${n}: password is required`)
      if (r.password && r.password.length < 8) errs.push(`Row ${n}: password must be at least 8 characters`)
      if (!r.section_name?.trim()) errs.push(`Row ${n}: section_name is required`)
      else if (!sectionMap[r.section_name.toLowerCase().trim()])
        errs.push(`Row ${n}: section "${r.section_name}" not found — create it first`)
    })
    setErrors(errs)
    setRows(parsed)
  }

  async function handleImport() {
    if (!rows.length || errors.length) return
    setRunning(true)
    const results = []
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i]
      const section_id = sectionMap[r.section_name.toLowerCase().trim()]
      try {
        await createStudentUser({
          email:        r.email.trim().toLowerCase(),
          password:     r.password.trim(),
          student_name: r.student_name.trim(),
          father_name:  r.father_name.trim(),
          reg_number:   r.reg_number.trim(),
          section_id,
        })
        results.push({ name: r.student_name, ok: true })
      } catch (err) {
        results.push({ name: r.student_name, ok: false, error: err.message })
      }
      setProgress({ done: i + 1, total: rows.length, results: [...results] })
    }
    setRunning(false)
    onDone()
  }

  const canImport = rows.length > 0 && errors.length === 0 && !progress

  return (
    <Modal open={open} onClose={running ? undefined : onClose} title="Bulk Upload Students" size="lg">
      <div className="flex flex-col gap-5">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-ink mb-2">CSV Format</p>
          <code className="block text-xs font-mono text-ink-muted bg-white/60 rounded-lg p-3 border border-primary/10 whitespace-pre">{`reg_number,student_name,father_name,section_name,email,password\n"BSAI-01","Ali Hassan","Hassan Ali","Section A","ali@iub.edu.pk","Pass@1234"\n"BSAI-02","Sara Khan","Khan Sahib","Section B","sara@iub.edu.pk","Pass@5678"`}</code>
          <p className="text-xs text-ink-muted mt-2">
            All columns required. <span className="font-medium text-ink">section_name</span> must match an existing active section.
          </p>
          {sections.length > 0 && (
            <p className="text-xs text-ink-muted mt-1">
              Available sections: <span className="font-medium text-ink">{sections.map(s => s.section_name).join(', ')}</span>
            </p>
          )}
        </div>

        {!progress && (
          <div>
            <label className="form-label">Upload CSV File</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile}
              className="block w-full text-sm text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
          </div>
        )}

        {errors.length > 0 && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark space-y-1 max-h-40 overflow-y-auto">
            {errors.map((e, i) => <p key={i} className="flex items-start gap-1.5"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{e}</p>)}
          </div>
        )}

        {rows.length > 0 && !progress && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{rows.length} student{rows.length !== 1 ? 's' : ''} ready to import</span>
              <button className="btn-ghost p-1" onClick={() => { setRows([]); setErrors([]); if (fileRef.current) fileRef.current.value = '' }}><X size={14} /></button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
              {rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                    {r.student_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{r.student_name}</div>
                    <div className="text-xs text-ink-muted truncate">{r.reg_number} · {r.section_name} · {r.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {progress && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Processing…</span>
              <span className="font-medium text-ink">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {progress.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.ok ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {r.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  <span className="font-medium">{r.name}</span>
                  {!r.ok && <span className="truncate">— {r.error}</span>}
                </div>
              ))}
            </div>
            {!running && (
              <div className="pt-1 text-sm text-ink-muted">
                Done: <span className="text-success font-medium">{progress.results.filter(r => r.ok).length} created</span>
                {progress.results.filter(r => !r.ok).length > 0 && <span className="text-danger font-medium ml-2">{progress.results.filter(r => !r.ok).length} failed</span>}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {!running && <button className="btn-outline" onClick={onClose}>{progress ? 'Close' : 'Cancel'}</button>}
          {canImport && <button className="btn-primary" onClick={handleImport}><Upload size={15} /> Import {rows.length} Students</button>}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminStudents({ isReadOnly = false }) {
  const [students,  setStudents]  = useState([])
  const [sections,  setSections]  = useState([])
  const [modalOpen, setModal]     = useState(false)
  const [bulkOpen,  setBulkOpen]  = useState(false)
  const [editRow,   setEditRow]   = useState(null)
  const [form,      setForm]      = useState(emptyForm)
  const [confirm,   setConfirm]   = useState(null)
  const [search,    setSearch]    = useState('')
  const [filterSection, setFilterSection] = useState('')
  const [filterStatus,  setFilterStatus]  = useState('all')
  const [sortKey,   setSortKey]   = useState('student_name')
  const [sortDir,   setSortDir]   = useState('asc')

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  function SortIcon({ col }) {
    if (sortKey !== col) return <ArrowUpDown size={13} className="text-ink-faint ml-1" />
    return sortDir === 'asc' ? <ArrowUp size={13} className="text-primary ml-1" /> : <ArrowDown size={13} className="text-primary ml-1" />
  }

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
            student_name: student_name.trim(), father_name: father_name.trim(),
            reg_number: reg_number.trim(), section_id,
          })
          toast('Student created — they can now log in', 'success')
        }
      })
      setModal(false)
      await load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function toggleActive(s) {
    const newActive = !s.is_active
    try {
      await mutator.run(async () => {
        await dbQuery(supabase.from('students').update({ is_active: newActive }).eq('id', s.id))
        if (s.user_id) await dbQuery(supabase.from('user_profiles').update({ is_active: newActive }).eq('id', s.user_id))
      })
      toast(newActive ? 'Student activated' : 'Student deactivated', 'success')
      await load()
    } catch (err) { toast(err.message, 'error') }
  }

  async function deleteStudent(s) {
    try {
      await mutator.run(() => dbQuery(supabase.from('students').delete().eq('id', s.id)))
      toast('Student deleted', 'success')
      await load()
    } catch (err) { toast(err.message, 'error') }
  }

  const filtered = students
    .filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.student_name.toLowerCase().includes(q) || s.reg_number.toLowerCase().includes(q) || (s.father_name || '').toLowerCase().includes(q)
      const matchSection = !filterSection || s.section_id === filterSection
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.is_active : !s.is_active)
      return matchSearch && matchSection && matchStatus
    })
    .sort((a, b) => {
      let av, bv
      if (sortKey === 'section') { av = a.sections?.section_name || ''; bv = b.sections?.section_name || '' }
      else if (sortKey === 'is_active') { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0 }
      else { av = a[sortKey] || ''; bv = b[sortKey] || '' }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (loader.loading && !students.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-ink-muted text-sm mt-1">{students.length} enrolled</p>
        </div>
        <div className="flex gap-2">
          {!isReadOnly && <>
            <button className="btn-outline" onClick={() => setBulkOpen(true)}><Upload size={16} /> Bulk Upload</button>
            <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Student</button>
          </>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search name, reg#, father…"
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterSection} onChange={e => setFilterSection(e.target.value)}>
          <option value="">All Sections</option>
          {sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}
        </select>
        <select className="form-input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {students.length}</span>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead><tr>
            <th><button className="flex items-center" onClick={() => toggleSort('reg_number')}>Reg #<SortIcon col="reg_number" /></button></th>
            <th><button className="flex items-center" onClick={() => toggleSort('student_name')}>Student<SortIcon col="student_name" /></button></th>
            <th><button className="flex items-center" onClick={() => toggleSort('father_name')}>Father Name<SortIcon col="father_name" /></button></th>
            <th><button className="flex items-center" onClick={() => toggleSort('section')}>Section<SortIcon col="section" /></button></th>
            <th><button className="flex items-center" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></button></th>
            <th>Actions</th>
          </tr></thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td className="font-mono text-xs text-ink-muted">{s.reg_number}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">{s.student_name[0].toUpperCase()}</div>
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
                    {!isReadOnly && <>
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                      <button className="btn-ghost p-1.5" onClick={() => toggleActive(s)} disabled={mutator.loading}>
                        {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-ink-faint" />}
                      </button>
                      <button className="btn-ghost p-1.5 text-danger"
                        onClick={() => setConfirm({ action: () => deleteStudent(s), msg: `Delete "${s.student_name}"?` })}>
                        <Trash2 size={14} />
                      </button>
                    </>}
                    {isReadOnly && <span className="text-xs text-ink-faint italic">View only</span>}
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
              <select className="form-input" value={form.section_id} onChange={e => setForm(f => ({ ...f, section_id: e.target.value }))}>
                <option value="">-- Select Section --</option>
                {sections.map(sec => <option key={sec.id} value={sec.id}>{sec.section_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Student Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.student_name} onChange={e => setForm(f => ({ ...f, student_name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Father Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.father_name} onChange={e => setForm(f => ({ ...f, father_name: e.target.value }))} />
          </div>
          {!editRow && (
            <>
              <div>
                <label className="form-label">Email <span className="text-danger">*</span></label>
                <input className="form-input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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

      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)}
        onDone={() => { load(); toast('Bulk import complete', 'success') }}
        sections={sections} />

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
