import { useEffect, useState, useRef } from 'react'
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
import { Plus, Edit2, Trash2, Upload, Database, ToggleLeft, ToggleRight, X, Eye, CheckCircle } from 'lucide-react'

// ─── Option labels ────────────────────────────────────────────────────────────
const LABELS = ['A', 'B', 'C', 'D', 'E']

// emptyOptions: array of 5 { text, isCorrect }
// First option defaults to correct so the form is always valid on first render
function makeEmptyOptions() {
  return LABELS.map((_, i) => ({ text: '', isCorrect: i === 0 }))
}

// Build initial options from a DB question row
function optionsFromRow(q) {
  const raw = [q.option_a, q.option_b, q.option_c, q.option_d, q.option_e]
  // option_a is always the correct one in DB
  const filled = raw.map((text, i) => ({ text: text || '', isCorrect: i === 0 }))
  // Keep at least 2 entries visible; trim trailing empty ones beyond index 1
  return filled
}

// Convert options array back to DB payload (rotate correct to option_a)
function optionsToPayload(options) {
  const filled     = options.filter(o => o.text.trim() !== '')
  const correctIdx = filled.findIndex(o => o.isCorrect)
  if (correctIdx === -1) return null   // caller should validate before this

  // Rotate so correct is first (= option_a)
  const rotated = [
    filled[correctIdx],
    ...filled.slice(0, correctIdx),
    ...filled.slice(correctIdx + 1),
  ]

  return {
    option_a: rotated[0]?.text.trim() || '',
    option_b: rotated[1]?.text.trim() || null,
    option_c: rotated[2]?.text.trim() || null,
    option_d: rotated[3]?.text.trim() || null,
    option_e: rotated[4]?.text.trim() || null,
  }
}

// ─── Option row component ─────────────────────────────────────────────────────
function OptionRow({ label, option, onChange, onMarkCorrect, canRemove, onRemove }) {
  return (
    <div className={`
      flex items-center gap-2 p-3 rounded-xl border transition-colors
      ${option.isCorrect
        ? 'border-success/40 bg-success/5'
        : 'border-surface-border bg-white hover:border-ink-faint'}
    `}>
      {/* Label badge */}
      <span className={`
        w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
        ${option.isCorrect ? 'bg-success text-white' : 'bg-surface-border text-ink-muted'}
      `}>
        {label}
      </span>

      {/* Text input */}
      <input
        className={`
          flex-1 bg-transparent border-none outline-none text-sm
          placeholder-ink-faint text-ink min-w-0
        `}
        placeholder={`Option ${label}…`}
        value={option.text}
        onChange={e => onChange(e.target.value)}
      />

      {/* Correct? pill toggle */}
      <button
        type="button"
        onClick={onMarkCorrect}
        title={option.isCorrect ? 'This is the correct answer' : 'Mark as correct answer'}
        className={`
          flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold
          flex-shrink-0 transition-all duration-150 select-none
          ${option.isCorrect
            ? 'bg-success text-white shadow-sm'
            : 'bg-surface-border text-ink-muted hover:bg-success/10 hover:text-success-dark border border-transparent hover:border-success/30'}
        `}
      >
        {option.isCorrect && <CheckCircle size={11} className="flex-shrink-0" />}
        {option.isCorrect ? 'Correct' : 'Correct?'}
      </button>

      {/* Remove button (only if more than 2 options) */}
      {canRemove ? (
        <button type="button" onClick={onRemove}
          className="w-6 h-6 rounded-full flex items-center justify-center text-ink-faint hover:text-danger hover:bg-danger/10 flex-shrink-0 transition-colors">
          <X size={13} />
        </button>
      ) : (
        <span className="w-6 flex-shrink-0" /> // spacer to keep alignment
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
const PAGE = 50

export default function AdminDataBank() {
  const [questions, setQuestions] = useState([])
  const [subjects,  setSubjects]  = useState([])
  const [filterSub, setFilterSub] = useState('')
  const [page,      setPage]      = useState(0)
  const [hasMore,   setHasMore]   = useState(false)

  // Form state
  const [modalOpen,    setModal]    = useState(false)
  const [editRow,      setEditRow]  = useState(null)
  const [questionText, setQText]    = useState('')
  const [subjectId,    setSubjId]   = useState('')
  const [options,      setOptions]  = useState(makeEmptyOptions())

  // Bulk upload state
  const [bulkModal,   setBulkModal] = useState(false)
  const [bulkText,    setBulkText]  = useState('')
  const [bulkSubject, setBulkSub]   = useState('')
  const [preview,     setPreview]   = useState(null)

  const [confirm, setConfirm] = useState(null)

  const { toasts, toast, dismiss } = useToast()
  const loader   = useApiCall()
  const saver    = useApiCall()
  const mutator  = useApiCall()
  const importer = useApiCall()
  const fileRef  = useRef()

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

  // ── Open form ──────────────────────────────────────────────────────────────
  function openAdd() {
    setQText('')
    setSubjId(filterSub || '')
    setOptions(makeEmptyOptions())
    setEditRow(null)
    setModal(true)
  }

  function openEdit(q) {
    setQText(q.question_text)
    setSubjId(q.subject_id)
    setOptions(optionsFromRow(q))
    setEditRow(q)
    setModal(true)
  }

  // ── Option editing helpers ─────────────────────────────────────────────────
  function updateOptionText(idx, text) {
    setOptions(prev => prev.map((o, i) => i === idx ? { ...o, text } : o))
  }

  function markCorrect(idx) {
    // Toggle off if already correct and there's a filled alternative
    setOptions(prev => prev.map((o, i) => ({ ...o, isCorrect: i === idx })))
  }

  function addOption() {
    if (options.length >= 5) return
    setOptions(prev => [...prev, { text: '', isCorrect: false }])
  }

  function removeOption(idx) {
    if (options.length <= 2) return
    setOptions(prev => {
      const next = prev.filter((_, i) => i !== idx)
      // If we removed the correct one, default to the first filled option
      const hasCorrect = next.some(o => o.isCorrect)
      if (!hasCorrect) {
        const firstFilled = next.findIndex(o => o.text.trim() !== '')
        if (firstFilled !== -1) next[firstFilled] = { ...next[firstFilled], isCorrect: true }
        else next[0] = { ...next[0], isCorrect: true }
      }
      return next
    })
  }

  // ── Validate form ──────────────────────────────────────────────────────────
  function validateForm() {
    if (!questionText.trim()) return 'Question text is required.'
    if (!subjectId)           return 'Subject is required.'
    const filled = options.filter(o => o.text.trim() !== '')
    if (filled.length < 2)   return 'At least 2 options are required.'
    if (!filled.some(o => o.isCorrect)) return 'Mark one option as correct.'
    return null
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const err = validateForm()
    if (err) { toast(err, 'error'); return }

    const optsPayload = optionsToPayload(options)
    if (!optsPayload) { toast('Could not determine correct answer.', 'error'); return }

    try {
      await saver.run(async () => {
        const payload = {
          question_text: questionText.trim(),
          subject_id:    subjectId,
          ...optsPayload,
          updated_at:    new Date().toISOString(),
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
    } catch (e) {
      toast(e.message, 'error')
    }
  }

  // ── Toggle / Delete ────────────────────────────────────────────────────────
  async function toggleQ(q) {
    try {
      await mutator.run(() =>
        dbQuery(supabase.from('questions').update({ is_active: !q.is_active }).eq('id', q.id))
      )
      await loadQuestions()
    } catch (e) { toast(e.message, 'error') }
  }

  async function deleteQ(q) {
    try {
      await mutator.run(() => dbQuery(supabase.from('questions').delete().eq('id', q.id)))
      toast('Question deleted', 'success')
      await loadQuestions()
    } catch (e) { toast(e.message, 'error') }
  }

  // ── Bulk upload ────────────────────────────────────────────────────────────
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
      setBulkModal(false); setBulkText(''); setPreview(null); setBulkSub('')
      if (fileRef.current) fileRef.current.value = ''
      await loadQuestions()
    } catch (e) { toast(e.message, 'error') }
  }

  async function handleFileUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    setBulkText(text)
    setPreview(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loader.loading && !questions.length) return <AdminLayout><PageSpinner /></AdminLayout>

  // Filled options for the visible form rows (always show at least 2)
  const visibleCount = Math.max(2, options.filter(o => o.text.trim() !== '').length + 1, options.length)

  return (
    <AdminLayout>
      <ToastContainer toasts={toasts} dismiss={dismiss} />

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
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

      {/* Filter */}
      <div className="flex gap-3 mb-4">
        <select className="form-input max-w-xs" value={filterSub}
                onChange={e => { setFilterSub(e.target.value); setPage(0) }}>
          <option value="">All Subjects</option>
          {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-1/2">Question</th>
              <th>Subject</th>
              <th>Options</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map(q => {
              const optCount = [q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean).length + 1
              return (
                <tr key={q.id}>
                  <td>
                    <p className="text-sm text-ink line-clamp-2">{q.question_text}</p>
                    <p className="text-xs text-success mt-0.5 flex items-center gap-1">
                      <CheckCircle size={11} /> {q.option_a}
                    </p>
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
                      <button className="btn-ghost p-1.5" onClick={() => openEdit(q)} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn-ghost p-1.5" onClick={() => toggleQ(q)} disabled={mutator.loading}
                        title={q.is_active ? 'Deactivate' : 'Activate'}>
                        {q.is_active
                          ? <ToggleRight size={14} className="text-success" />
                          : <ToggleLeft size={14} />}
                      </button>
                      <button className="btn-ghost p-1.5 text-danger"
                        onClick={() => setConfirm({ action: () => deleteQ(q), msg: 'Delete this question permanently?' })}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {!questions.length && !loader.loading && (
              <tr>
                <td colSpan={5} className="text-center py-10 text-ink-muted">
                  <Database size={32} className="mx-auto mb-2 opacity-30" />
                  No questions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4 text-sm text-ink-muted">
        <span>Page {page + 1}</span>
        <div className="flex gap-2">
          <button className="btn-outline py-1" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>← Prev</button>
          <button className="btn-outline py-1" onClick={() => setPage(p => p + 1)} disabled={!hasMore}>Next →</button>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────── */}
      <Modal open={modalOpen} onClose={() => setModal(false)}
             title={editRow ? 'Edit Question' : 'Add Question'} size="lg">
        <div className="flex flex-col gap-5">

          {/* Subject */}
          <div>
            <label className="form-label">Subject <span className="text-danger">*</span></label>
            <select className="form-input" value={subjectId}
                    onChange={e => setSubjId(e.target.value)}>
              <option value="">-- Select Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          {/* Question text */}
          <div>
            <label className="form-label">Question Text <span className="text-danger">*</span></label>
            <textarea
              className="form-input"
              rows={3}
              value={questionText}
              onChange={e => setQText(e.target.value)}
              placeholder="Type your question here…"
              autoFocus
            />
          </div>

          {/* Options */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">
                Answer Options <span className="text-danger">*</span>
              </label>
              <p className="text-xs text-ink-muted">
                Click <span className="font-semibold text-success-dark">Correct?</span> on the right answer
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {options.map((opt, idx) => (
                <OptionRow
                  key={idx}
                  label={LABELS[idx]}
                  option={opt}
                  onChange={text => updateOptionText(idx, text)}
                  onMarkCorrect={() => markCorrect(idx)}
                  canRemove={options.length > 2}
                  onRemove={() => removeOption(idx)}
                />
              ))}
            </div>

            {/* Add option button */}
            {options.length < 5 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 flex items-center gap-1.5 text-sm text-primary hover:text-primary-dark transition-colors">
                <Plus size={14} /> Add option
              </button>
            )}

            {/* Hint */}
            <p className="text-xs text-ink-muted mt-2">
              Options will be shuffled randomly for each student during the exam.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1 border-t border-surface-border">
            <button className="btn-outline" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn-primary" onClick={handleSave} disabled={saver.loading}>
              {saver.loading
                ? <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving…
                  </span>
                : editRow ? 'Update Question' : 'Add Question'
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Bulk Upload Modal ────────────────────────────────────────────── */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)}
             title="Bulk Upload Questions" size="xl">
        <div className="flex flex-col gap-5">

          {/* Format guide */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <p className="text-sm font-semibold text-ink mb-3">File Format (.txt)</p>
            <pre className="font-mono text-xs text-ink-muted leading-relaxed whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-primary/10">{
`This is a question text.
first option
correct:second option
third option
fourth option

Who wrote Hamlet?
Tolstoy
Dickens
correct:Shakespeare
Homer`
            }</pre>
            <ul className="mt-3 space-y-1 text-xs text-ink-muted">
              <li>• <strong className="text-ink">Line 1</strong> — question text</li>
              <li>• <strong className="text-ink">Lines 2–6</strong> — options (2 minimum, 5 maximum)</li>
              <li>• <strong className="text-ink">correct:</strong> prefix on the right answer (e.g. <code className="bg-surface px-1 rounded">correct:Paris</code>). If omitted, first option is assumed correct.</li>
              <li>• <strong className="text-ink">Blank line</strong> — separates questions</li>
            </ul>
          </div>

          {/* Subject selector */}
          <div>
            <label className="form-label">Target Subject <span className="text-danger">*</span></label>
            <select className="form-input" value={bulkSubject} onChange={e => setBulkSub(e.target.value)}>
              <option value="">-- Select Subject --</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.subject_name}</option>)}
            </select>
          </div>

          {/* File upload */}
          <div>
            <label className="form-label">Upload .txt File</label>
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              onChange={handleFileUpload}
              className="block w-full text-sm text-ink-muted
                         file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0
                         file:text-sm file:font-medium file:bg-primary/10 file:text-primary
                         hover:file:bg-primary/20 cursor-pointer"
            />
          </div>

          {/* Paste text */}
          <div>
            <label className="form-label">Or Paste Text</label>
            <textarea
              className="form-input font-mono text-xs"
              rows={10}
              value={bulkText}
              onChange={e => { setBulkText(e.target.value); setPreview(null) }}
              placeholder={`This is a question text.\nfirst option\ncorrect:second option\nthird option\n\nNext question…`}
            />
          </div>

          {/* Parse / Preview / Import */}
          {!preview ? (
            <button className="btn-primary" onClick={handleBulkParse}
                    disabled={!bulkText.trim() || !bulkSubject}>
              <Eye size={15} /> Parse &amp; Preview
            </button>
          ) : (
            <div className="border border-surface-border rounded-xl overflow-hidden">
              {/* Preview header */}
              <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
                <span className="text-sm font-semibold text-ink">
                  {preview.length} question{preview.length !== 1 ? 's' : ''} parsed successfully
                </span>
                <button className="btn-ghost p-1" onClick={() => setPreview(null)}>
                  <X size={14} />
                </button>
              </div>

              {/* Preview list */}
              <div className="max-h-56 overflow-y-auto divide-y divide-surface-border">
                {preview.map((q, i) => (
                  <div key={i} className="px-4 py-3 flex gap-3">
                    <span className="text-xs text-ink-faint font-mono mt-0.5 flex-shrink-0 w-5">{i + 1}.</span>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{q.question_text}</p>
                      <p className="text-xs text-success flex items-center gap-1 mt-0.5">
                        <CheckCircle size={10} /> {q.option_a}
                      </p>
                      <p className="text-xs text-ink-faint mt-0.5">
                        {[q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Import footer */}
              <div className="p-4 border-t border-surface-border flex flex-wrap justify-between items-center gap-2">
                <button className="btn-ghost text-sm" onClick={() => { setPreview(null); setBulkText('') }}>
                  Start over
                </button>
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
