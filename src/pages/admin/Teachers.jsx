import { useEffect, useRef, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { createTeacherUser } from '../../lib/adminApi'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Search, UserCheck, Upload, X, CheckCircle, AlertTriangle, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

const emptyForm = { teacher_name: '', designation: '', expertise: '', email: '', password: '' }

// ─── CSV parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { headers: [], rows: [] }
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase())
  const rows = lines.slice(1).map(line => {
    // Handle quoted fields containing commas
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

const TEACHER_REQUIRED = ['teacher_name', 'email', 'password']

// ─── Bulk Upload Modal ────────────────────────────────────────────────────────
function BulkUploadModal({ open, onClose, onDone }) {
  const [rows,     setRows]     = useState([])
  const [errors,   setErrors]   = useState([])   // parse errors
  const [progress, setProgress] = useState(null) // { done, total, results }
  const [running,  setRunning]  = useState(false)
  const fileRef = useRef()

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
    const missing = TEACHER_REQUIRED.filter(f => !headers.includes(f))
    if (missing.length) {
      setErrors([`Missing required columns: ${missing.join(', ')}`])
      setRows([])
      return
    }
    const errs = []
    parsed.forEach((r, i) => {
      if (!r.teacher_name?.trim()) errs.push(`Row ${i + 2}: teacher_name is required`)
      if (!r.email?.trim())        errs.push(`Row ${i + 2}: email is required`)
      if (!r.password?.trim())     errs.push(`Row ${i + 2}: password is required`)
      if (r.password && r.password.length < 8) errs.push(`Row ${i + 2}: password must be at least 8 characters`)
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
      try {
        await createTeacherUser({
          email:        r.email.trim().toLowerCase(),
          password:     r.password.trim(),
          teacher_name: r.teacher_name.trim(),
          designation:  r.designation?.trim() || null,
          expertise:    r.expertise?.trim()   || null,
        })
        results.push({ name: r.teacher_name, ok: true })
      } catch (err) {
        results.push({ name: r.teacher_name, ok: false, error: err.message })
      }
      setProgress({ done: i + 1, total: rows.length, results: [...results] })
    }
    setRunning(false)
    onDone()
  }

  const canImport = rows.length > 0 && errors.length === 0 && !progress

  return (
    <Modal open={open} onClose={running ? undefined : onClose} title="Bulk Upload Teachers" size="lg">
      <div className="flex flex-col gap-5">

        {/* Format guide */}
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
          <p className="font-semibold text-ink mb-2">CSV Format</p>
          <code className="block text-xs font-mono text-ink-muted bg-white/60 rounded-lg p-3 border border-primary/10 whitespace-pre">
{`teacher_name,designation,expertise,email,password
"John Smith","Professor","Artificial Intelligence","john.smith@example.com","Pass@1234"
"Jane Doe","Lecturer","Machine Learning","jane.doe@example.com","Pass@5678"`}
          </code>
          <p className="text-xs text-ink-muted mt-2">
            Required: <span className="font-medium text-ink">teacher_name, email, password</span> · Optional: designation, expertise
          </p>
        </div>

        {/* File input */}
        {!progress && (
          <div>
            <label className="form-label">Upload CSV File</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv"
              onChange={handleFile}
              className="block w-full text-sm text-ink-muted
                file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                file:text-sm file:font-medium file:bg-primary/10 file:text-primary
                hover:file:bg-primary/20 cursor-pointer" />
          </div>
        )}

        {/* Parse errors */}
        {errors.length > 0 && (
          <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger-dark space-y-1">
            {errors.map((e, i) => <p key={i} className="flex items-start gap-1.5"><AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />{e}</p>)}
          </div>
        )}

        {/* Preview */}
        {rows.length > 0 && !progress && (
          <div className="border border-surface-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface border-b border-surface-border flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">{rows.length} teacher{rows.length !== 1 ? 's' : ''} ready to import</span>
              <button className="btn-ghost p-1" onClick={() => { setRows([]); setErrors([]); if (fileRef.current) fileRef.current.value = '' }}>
                <X size={14} />
              </button>
            </div>
            <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
              {rows.map((r, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center gap-3 text-sm">
                  <div className="w-7 h-7 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-semibold text-xs flex-shrink-0">
                    {r.teacher_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ink truncate">{r.teacher_name}</div>
                    <div className="text-xs text-ink-muted truncate">{r.email} {r.designation ? `· ${r.designation}` : ''}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Progress */}
        {progress && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">Processing…</span>
              <span className="font-medium text-ink">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-surface-border overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1.5">
              {progress.results.map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg
                  ${r.ok ? 'bg-success/10 text-success-dark' : 'bg-danger/10 text-danger-dark'}`}>
                  {r.ok ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                  <span className="font-medium">{r.name}</span>
                  {!r.ok && <span className="text-danger-dark/70 truncate">— {r.error}</span>}
                </div>
              ))}
            </div>
            {!running && (
              <div className="pt-1 text-sm text-ink-muted">
                Done: <span className="text-success font-medium">{progress.results.filter(r => r.ok).length} created</span>
                {progress.results.filter(r => !r.ok).length > 0 && (
                  <span className="text-danger font-medium ml-2">{progress.results.filter(r => !r.ok).length} failed</span>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          {!running && <button className="btn-outline" onClick={onClose}>{progress ? 'Close' : 'Cancel'}</button>}
          {canImport && (
            <button className="btn-primary" onClick={handleImport}>
              <Upload size={15} /> Import {rows.length} Teachers
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminTeachers({ isReadOnly = false }) {
  const [teachers,    setTeachers]    = useState([])
  const [modalOpen,   setModal]       = useState(false)
  const [bulkOpen,    setBulkOpen]    = useState(false)
  const [editRow,     setEditRow]     = useState(null)
  const [form,        setForm]        = useState(emptyForm)
  const [confirm,     setConfirm]     = useState(null)
  const [search,      setSearch]      = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortKey,     setSortKey]     = useState('teacher_name')
  const [sortDir,     setSortDir]     = useState('asc')

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
      const data = await dbQuery(
        supabase.from('teachers').select('*, user_profiles(is_active)').order('teacher_name')
      )
      setTeachers(data || [])
    })
  }

  function openAdd()   { setForm(emptyForm); setEditRow(null); setModal(true) }
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
    try {
      await saver.run(async () => {
        if (editRow) {
          await dbQuery(supabase.from('teachers').update({
            teacher_name: form.teacher_name.trim(),
            designation:  form.designation.trim() || null,
            expertise:    form.expertise.trim()   || null,
            updated_at:   new Date().toISOString(),
          }).eq('id', editRow.id))
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
      })
      setModal(false)
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function toggleActive(t) {
    const newActive = !t.is_active
    try {
      await mutator.run(async () => {
        await dbQuery(supabase.from('teachers').update({ is_active: newActive }).eq('id', t.id))
        if (t.user_id) {
          await dbQuery(supabase.from('user_profiles').update({ is_active: newActive }).eq('id', t.user_id))
        }
      })
      toast(newActive ? 'Teacher activated' : 'Teacher deactivated', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function deleteTeacher(t) {
    try {
      await mutator.run(() => dbQuery(supabase.from('teachers').delete().eq('id', t.id)))
      toast('Teacher deleted', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const filtered = teachers
    .filter(t => {
      const q = search.toLowerCase()
      const matchSearch = !q || t.teacher_name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q) || (t.designation || '').toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? t.is_active : !t.is_active)
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      let av = a[sortKey] || '', bv = b[sortKey] || ''
      if (sortKey === 'is_active') { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0 }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (loader.loading && !teachers.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Teachers</h1>
          <p className="text-ink-muted text-sm mt-1">{teachers.length} total</p>
        </div>
        <div className="flex gap-2">
          {!isReadOnly && <>
            <button className="btn-outline" onClick={() => setBulkOpen(true)}>
              <Upload size={16} /> Bulk Upload
            </button>
            <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Teacher</button>
          </>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search name, email, designation…"
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {teachers.length}</span>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th><button className="flex items-center" onClick={() => toggleSort('teacher_name')}>Teacher<SortIcon col="teacher_name" /></button></th>
              <th><button className="flex items-center" onClick={() => toggleSort('designation')}>Designation<SortIcon col="designation" /></button></th>
              <th>Expertise</th>
              <th><button className="flex items-center" onClick={() => toggleSort('email')}>Email<SortIcon col="email" /></button></th>
              <th><button className="flex items-center" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></button></th>
              <th>Actions</th>
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
                    {!isReadOnly && <>
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(t)}><Edit2 size={14} /></button>
                      <button className="btn-ghost p-1.5" onClick={() => toggleActive(t)} disabled={mutator.loading}>
                        {t.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} className="text-ink-faint" />}
                      </button>
                      <button className="btn-ghost p-1.5 text-danger"
                        onClick={() => setConfirm({ action: () => deleteTeacher(t), msg: `Delete "${t.teacher_name}"?` })}>
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
                <UserCheck size={32} className="mx-auto mb-2 opacity-30" />No teachers found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModal(false)} title={editRow ? 'Edit Teacher' : 'Add Teacher'}>
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Teacher Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.teacher_name} autoFocus
                   onChange={e => setForm(f => ({ ...f, teacher_name: e.target.value }))} />
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
                       onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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
              To reset a password, use the User Passwords page.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              {saver.loading ? 'Saving…' : editRow ? 'Update' : 'Create Teacher'}
            </button>
          </div>
        </div>
      </Modal>

      <BulkUploadModal
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDone={() => { load(); toast('Bulk import complete', 'success') }}
      />

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
