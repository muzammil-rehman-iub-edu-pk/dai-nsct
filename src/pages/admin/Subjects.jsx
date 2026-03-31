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
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, FlaskConical, Info, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

export default function AdminSubjects({ isReadOnly = false }) {
  const [subjects, setSubjects] = useState([])
  const [qCounts, setQCounts]   = useState({})
  const [modalOpen, setModal]   = useState(false)
  const [editRow, setEditRow]   = useState(null)
  const [form, setForm]         = useState({ subject_name: '', description: '', weightage: '10' })
  const [confirm, setConfirm]   = useState(null)
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortKey,      setSortKey]      = useState('subject_name')
  const [sortDir,      setSortDir]      = useState('asc')

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
      const subs = await dbQuery(
        supabase.from('subjects').select('*').order('subject_name')
      )
      setSubjects(subs || [])

      // Count per subject server-side to avoid the 1000-row client limit
      const counts = {}
      await Promise.all(
        (subs || []).map(async s => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('subject_id', s.id)
            .eq('is_active', true)
          counts[s.id] = count || 0
        })
      )
      setQCounts(counts)
    })
  }

  function openAdd()   { setForm({ subject_name: '', description: '', weightage: '10' }); setEditRow(null); setModal(true) }
  function openEdit(s) {
    setForm({ subject_name: s.subject_name, description: s.description || '', weightage: String(s.weightage) })
    setEditRow(s); setModal(true)
  }

  async function handleSave() {
    if (!form.subject_name.trim()) { toast('Subject name is required', 'error'); return }
    const w = parseFloat(form.weightage)
    if (isNaN(w) || w <= 0 || w > 100) { toast('Weightage must be between 0.5 and 100', 'error'); return }
    try {
      await saver.run(async () => {
        const payload = {
          subject_name: form.subject_name.trim(),
          description:  form.description.trim() || null,
          weightage:    w,
          updated_at:   new Date().toISOString(),
        }
        if (editRow) {
          await dbQuery(supabase.from('subjects').update(payload).eq('id', editRow.id))
          toast('Subject updated', 'success')
        } else {
          await dbQuery(supabase.from('subjects').insert(payload))
          toast('Subject created', 'success')
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
        dbQuery(supabase.from('subjects').update({ is_active: !s.is_active }).eq('id', s.id))
      )
      toast(!s.is_active ? 'Subject activated' : 'Subject deactivated', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function deleteSubject(s) {
    try {
      await mutator.run(() =>
        dbQuery(supabase.from('subjects').delete().eq('id', s.id))
      )
      toast('Subject deleted', 'success')
      await load()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  const activeSubjects = subjects.filter(s => s.is_active)
  const totalWeight    = activeSubjects.reduce((sum, s) => sum + parseFloat(s.weightage), 0)

  const filtered = subjects
    .filter(s => {
      const q = search.toLowerCase()
      const matchSearch = !q || s.subject_name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || (filterStatus === 'active' ? s.is_active : !s.is_active)
      return matchSearch && matchStatus
    })
    .sort((a, b) => {
      let av, bv
      if (sortKey === 'weightage') { av = parseFloat(a.weightage); bv = parseFloat(b.weightage) }
      else if (sortKey === 'questions') { av = qCounts[a.id] || 0; bv = qCounts[b.id] || 0 }
      else if (sortKey === 'is_active') { av = a.is_active ? 1 : 0; bv = b.is_active ? 1 : 0 }
      else { av = a[sortKey] || ''; bv = b[sortKey] || '' }
      const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv))
      return sortDir === 'asc' ? cmp : -cmp
    })

  if (loader.loading && !subjects.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="page-title">Subjects</h1>
          <p className="text-ink-muted text-sm mt-1">{subjects.length} subjects</p>
        </div>
        {!isReadOnly && <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Subject</button>}
      </div>

      <div className="card mb-6 flex items-center gap-3 p-4">
        <Info size={18} className="text-primary flex-shrink-0" />
        <p className="text-sm text-ink-muted">
          Total active weightage: <strong className="text-ink">{totalWeight.toFixed(1)}</strong>
          {' '}— questions are distributed proportionally when generating exams.
          Inactive subjects are excluded entirely.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input className="form-input pl-9" placeholder="Search subjects…"
                 value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="form-input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <span className="text-xs text-ink-muted self-center">{filtered.length} of {subjects.length}</span>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th><button className="flex items-center" onClick={() => toggleSort('subject_name')}>Subject<SortIcon col="subject_name" /></button></th>
              <th>Description</th>
              <th><button className="flex items-center" onClick={() => toggleSort('weightage')}>Weightage<SortIcon col="weightage" /></button></th>
              <th><button className="flex items-center" onClick={() => toggleSort('questions')}>Questions<SortIcon col="questions" /></button></th>
              <th><button className="flex items-center" onClick={() => toggleSort('is_active')}>Status<SortIcon col="is_active" /></button></th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => {
              const qCount = qCounts[s.id] || 0
              const pct    = totalWeight > 0 ? ((s.weightage / totalWeight) * 100).toFixed(1) : 0
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
                      {!isReadOnly && <>
                        <button className="btn-ghost p-1.5" onClick={() => openEdit(s)}><Edit2 size={14} /></button>
                        <button className="btn-ghost p-1.5" onClick={() => toggleActive(s)} disabled={mutator.loading}>
                          {s.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} />}
                        </button>
                        <button className="btn-ghost p-1.5 text-danger"
                          onClick={() => setConfirm({ action: () => deleteSubject(s), msg: `Delete "${s.subject_name}" and all its questions?` })}>
                          <Trash2 size={14} />
                        </button>
                      </>}
                      {isReadOnly && <span className="text-xs text-ink-faint italic">View only</span>}
                    </div>
                  </td>
                </tr>
              )
            })}
            {!subjects.length && !loader.loading && (
              <tr><td colSpan={6} className="text-center py-10 text-ink-muted">No subjects yet</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal open={modalOpen} onClose={() => setModal(false)}
             title={editRow ? 'Edit Subject' : 'Add Subject'} size="sm">
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Subject Name <span className="text-danger">*</span></label>
            <input className="form-input" value={form.subject_name} autoFocus
                   onChange={e => setForm(f => ({ ...f, subject_name: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Weightage <span className="text-danger">*</span></label>
            <input className="form-input" type="number" min="0.5" max="100" step="0.5" value={form.weightage}
                   onChange={e => setForm(f => ({ ...f, weightage: e.target.value }))} />
            <p className="text-xs text-ink-muted mt-1">
              Relative weight for question distribution. E.g. Math=30, English=20 → 60% / 40%.
            </p>
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
