import { useEffect, useState } from 'react'
import { AdminLayout } from '../../components/layout/Layout'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { useApiCall } from '../../hooks/useApiCall'
import { useToast } from '../../hooks/useToast'
import { parseBulkQuestions } from '../../lib/examEngine'
import { Modal } from '../../components/ui/Modal'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageSpinner } from '../../components/ui/Spinner'
import { ToastContainer } from '../../components/ui/Toast'
import { Plus, Edit2, Trash2, Upload, Database, ToggleLeft, ToggleRight, X, Eye } from 'lucide-react'

const emptyQ = { question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', option_e: '', subject_id: '' }
const PAGE = 50

export default function AdminDataBank() {
  const [questions, setQuestions] = useState([])
  const [subjects, setSubjects]   = useState([])
  const [filterSub, setFilterSub] = useState('')
  const [page, setPage]           = useState(0)
  const [hasMore, setHasMore]     = useState(false)
  const [modalOpen, setModal]     = useState(false)
  const [bulkModal, setBulkModal] = useState(false)
  const [editRow, setEditRow]     = useState(null)
  const [form, setForm]           = useState(emptyQ)
  const [bulkText, setBulkText]   = useState('')
  const [bulkSubject, setBulkSub] = useState('')
  const [preview, setPreview]     = useState(null)
  const [confirm, setConfirm]     = useState(null)

  const { toasts, toast, dismiss } = useToast()
  const loader  = useApiCall()
  const saver   = useApiCall()
  const mutator = useApiCall()
  const importer = useApiCall()

  useEffect(() => { loadSubjects() }, [])
  useEffect(() => { loadQuestions() }, [filterSub, page])

  async function loadSubjects() {
    const data = await dbQuery(supabase.from('subjects').select('id, subject_name').order('subject_name'))
    setSubjects(data || [])
  }

  async function loadQuestions() {
    await loader.run(async () => {
      let q = supabase.from('questions')
        .select('*, subjects(subject_name)')
        .order('created_at', { ascending: false })
        .range(page * PAGE, (page + 1) * PAGE - 1)
      if (filterSub) q = q.eq('subject_id', filterSub)
      const data = await dbQuery(q)
      setQuestions(data || [])
      setHasMore((data || []).length === PAGE)
    })
  }

  function openAdd()   { setForm({ ...emptyQ, subject_id: filterSub || '' }); setEditRow(null); setModal(true) }
  function openEdit(q) {
    setForm({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b || '',
              option_c: q.option_c || '', option_d: q.option_d || '', option_e: q.option_e || '',
              subject_id: q.subject_id })
    setEditRow(q); setModal(true)
  }

  async function handleSave() {
    if (!form.question_text.trim() || !form.option_a.trim() || !form.subject_id) {
      toast('Question text, correct answer, and subject are required', 'error'); return
    }
    try {
      await saver.run(async () => {
        const payload = {
          question_text: form.question_text.trim(),
          option_a: form.option_a.trim(),
          option_b: form.option_b.trim() || null,
          option_c: form.option_c.trim() || null,
          option_d: form.option_d.trim() || null,
          option_e: form.option_e.trim() || null,
          subject_id: form.subject_id,
          updated_at: new Date().toISOString(),
        }
        if (editRow) {
          await dbQuery(supabase.from('questions').update(payload).eq('id', editRow.id))
          toast('Question updated', 'success')
        } else {
          await dbQuery(supabase.from('questions').insert(payload))
          toast('Question added', 'success')
        }
      })
      setModal(false)
      await loadQuestions()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function toggleQ(q) {
    try {
      await mutator.run(() =>
        dbQuery(supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id))
      )
      await loadQuestions()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function deleteQ(q) {
    try {
      await mutator.run(() => dbQuery(supabase.from('questions').delete().eq('id', q.id)))
      toast('Question deleted', 'success')
      await loadQuestions()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  function handleBulkParse() {
    if (!bulkSubject) { toast('Select a subject first', 'error'); return }
    if (!bulkText.trim()) { toast('No text to parse', 'error'); return }
    const parsed = parseBulkQuestions(bulkText)
    if (!parsed.length) { toast('No valid questions found. Check the format.', 'error'); return }
    setPreview(parsed)
  }

  async function handleBulkImport() {
    if (!preview?.length) return
    try {
      await importer.run(async () => {
        const rows = preview.map(q => ({ ...q, subject_id: bulkSubject }))
        const CHUNK = 100
        for (let i = 0; i < rows.length; i += CHUNK) {
          await dbQuery(supabase.from('questions').insert(rows.slice(i, i + CHUNK)))
        }
      })
      toast(`${preview.length} questions imported successfully`, 'success')
      setBulkModal(false)
      setBulkText('')
      setPreview(null)
      setBulkSub('')
      await loadQuestions()
    } catch (err) {
      toast(err.message, 'error')
    }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    setBulkText(text)
    setPreview(null)
  }

  if (loader.loading && !questions.length) return <AdminLayout><PageSpinner /></AdminLayout>

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="page-title">Data Bank</h1>
          <p className="text-ink-muted text-sm mt-1">Manage MCQ question pool</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-outline" onClick={() => { setBulkModal(true); setPreview(null) }}>
            <Upload size={16} /> Bulk Upload
          </button>
          <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Question</button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <select className="form-input max-w-xs" value={filterSub}
                onChange={e => { setFilterSub(e.target.value); setPage(0) }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
        </select>
      </div>

      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr><th className="w-1/2">Question</th><th>Subject</th><th>Options</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {questions.map(q => {
              const optCount = [q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean).length + 1
              return (
                <tr key={q.id}>
                  <td>
                    <p className="text-sm text-ink line-clamp-2">{q.question_text}</p>
                    <p className="text-xs text-success mt-0.5">✓ {q.option_a}</p>
                  </td>
                  <td><span className="badge badge-accent">{q.subjects?.subject_name}</span></td>
                  <td className="text-ink-muted text-sm">{optCount}</td>
                  <td>
                    <span className={`badge ${q.is_active ? 'badge-success' : 'badge-muted'}`}>
                      {q.is_active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(q)}><Edit2 size={14} /></button>
                      <button className="btn-ghost p-1.5" onClick={() => toggleQ(q)} disabled={mutator.loading}>
                        {q.is_active ? <ToggleRight size={14} className="text-success" /> : <ToggleLeft size={14} />}
                      </button>
                      <button className="btn-ghost p-1.5 text-danger"
                        onClick={() => setConfirm({ action: () => deleteQ(q), msg: 'Delete this question?' })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!questions.length && !loader.loading && (
              <tr><td colSpan={5} className="text-center py-10 text-ink-muted">
                <Database size={32} className="mx-auto mb-2 opacity-30" />No questions found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex justify-between items-center mt-4 text-sm text-ink-muted">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <button className="btn-outline py-1" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
          <button className="btn-outline py-1" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next →</button>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModal(false)}
             title={editRow ? 'Edit Question' : 'Add Question'} size="lg">
        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Subject <span className="text-danger">*</span></label>
            <select className="form-input" value={form.subject_id}
                    onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">-- Select Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Question Text <span className="text-danger">*</span></label>
            <textarea className="form-input" rows={3} value={form.question_text} autoFocus
                      onChange={e => setForm(f => ({ ...f, question_text: e.target.value }))} />
          </div>
          <div className="p-3 rounded-xl bg-success/5 border border-success/20">
            <label className="form-label text-success-dark">Option A — Correct Answer <span className="text-danger">*</span></label>
            <input className="form-input border-success/30 focus:border-success" value={form.option_a}
                   onChange={e => setForm(f => ({ ...f, option_a: e.target.value }))} />
          </div>
          {['b','c','d','e'].map(x => (
            <div key={x}>
              <label className="form-label">Option {x.toUpperCase()} <span className="text-ink-faint text-xs">(wrong)</span></label>
              <input className="form-input" value={form[`option_${x}`]}
                     onChange={e => setForm(f => ({ ...f, [`option_${x}`]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              {saver.loading ? 'Saving…' : editRow ? 'Update' : 'Add Question'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Upload Modal */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Upload Questions" size="xl">
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
            <p className="font-semibold text-ink mb-2">File Format:</p>
            <pre className="font-mono text-xs text-ink-muted whitespace-pre-wrap">{`What is the capital of France?\nParis\nLondon\nBerlin\nMadrid\n\nWhat is 2+2?\n4\n3\n5\n6`}</pre>
            <p className="mt-2 text-ink-muted">First line = question. Next lines = options (first is CORRECT). Blank line separates questions.</p>
          </div>
          <div>
            <label className="form-label">Subject <span className="text-danger">*</span></label>
            <select className="form-input" value={bulkSubject} onChange={e => setBulkSub(e.target.value)}>
              <option value="">-- Select Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>
          <div>
            <label className="form-label">Upload .txt File</label>
            <input type="file" accept=".txt,text/plain" onChange={handleFileUpload}
                   className="block text-sm text-ink-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />
          </div>
          <div>
            <label className="form-label">Or Paste Text</label>
            <textarea className="form-input font-mono text-xs" rows={8} value={bulkText}
                      onChange={e => { setBulkText(e.target.value); setPreview(null) }}
                      placeholder="Paste question text here…" />
          </div>
          {!preview ? (
            <button className="btn-primary" onClick={handleBulkParse} disabled={!bulkText.trim() || !bulkSubject}>
              <Eye size={15} /> Parse & Preview
            </button>
          ) : (
            <div className="border border-surface-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
                <span className="text-sm font-semibold text-ink">{preview.length} questions ready</span>
                <button className="btn-ghost p-1" onClick={() => setPreview(null)}><X size={14} /></button>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-surface-border">
                {preview.map((q, i) => (
                  <div key={i} className="px-4 py-3">
                    <p className="text-xs font-medium text-ink line-clamp-1">{i+1}. {q.question_text}</p>
                    <p className="text-xs text-success">✓ {q.option_a}</p>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-surface-border flex justify-between items-center">
                <button className="btn-ghost text-sm" onClick={() => setPreview(null)}>Start over</button>
                <button className="btn-success" onClick={handleBulkImport} disabled={importer.loading}>
                  <Upload size={14} />
                  {importer.loading ? 'Importing…' : `Import ${preview.length} Questions`}
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      <ConfirmDialog open={!!confirm} onClose={() => setConfirm(null)}
        onConfirm={confirm?.action} message={confirm?.msg} danger />
    </AdminLayout>
  )
}
