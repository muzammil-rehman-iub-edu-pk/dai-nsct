import { useState, useRef } from 'react'
import { parseBulkQuestions } from '../../lib/examEngine'
import { supabase } from '../../lib/supabase'
import { dbQuery } from '../../lib/db'
import { Upload, FileText, CheckCircle, X, Eye } from 'lucide-react'

/**
 * BulkUploadParser — reusable bulk question uploader.
 * Used by both Admin DataBank and Teacher DataBank pages.
 *
 * Props:
 *   subjects  [{id, subject_name}]
 *   onImport  () => void  — called after successful import
 *   toast     fn          — from useToast
 */
export function BulkUploadParser({ subjects = [], onImport, toast }) {
  const [subjectId, setSubjectId] = useState('')
  const [rawText,   setRawText]   = useState('')
  const [parsed,    setParsed]    = useState(null)
  const [saving,    setSaving]    = useState(false)
  const fileRef = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    setRawText(text)
    setParsed(null)
  }

  function handleParse() {
    if (!subjectId)     { toast?.('Please select a subject first', 'error'); return }
    if (!rawText.trim()) { toast?.('No text to parse', 'error'); return }
    const result = parseBulkQuestions(rawText)
    if (!result.length) { toast?.('No valid questions found. Check the format.', 'error'); return }
    setParsed(result)
  }

  async function handleImport() {
    if (!parsed?.length || !subjectId) return
    setSaving(true)
    try {
      const rows  = parsed.map(q => ({ ...q, subject_id: subjectId }))
      const CHUNK = 100
      for (let i = 0; i < rows.length; i += CHUNK) {
        await dbQuery(supabase.from('questions').insert(rows.slice(i, i + CHUNK)))
      }
      toast?.(`✓ ${rows.length} questions imported successfully!`, 'success')
      reset()
      onImport?.()
    } catch (err) {
      toast?.(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setRawText('')
    setParsed(null)
    setSubjectId('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-5">

      {/* Format guide */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <p className="text-sm font-semibold text-ink mb-3 flex items-center gap-1.5">
          <FileText size={14} className="text-primary" /> File Format (.txt)
        </p>
        <pre className="font-mono text-xs text-ink-muted leading-relaxed whitespace-pre-wrap bg-white/60 rounded-lg p-3 border border-primary/10">{
`What is the speed of light?
150,000 km/s
correct:300,000 km/s
500 km/s

Who invented the telephone?
Thomas Edison
correct:Alexander Graham Bell
Nikola Tesla`
        }</pre>
        <ul className="mt-3 space-y-1 text-xs text-ink-muted">
          <li>• <strong className="text-ink">Line 1</strong> — question text</li>
          <li>• <strong className="text-ink">Lines 2–6</strong> — options (2 minimum, 5 maximum)</li>
          <li>• <strong className="text-ink">correct:</strong> prefix on the right answer. If omitted, first option is assumed correct.</li>
          <li>• <strong className="text-ink">Blank line</strong> — separates questions</li>
        </ul>
      </div>

      {/* Subject selector */}
      <div>
        <label className="form-label">Target Subject <span className="text-danger">*</span></label>
        <select className="form-input" value={subjectId} onChange={e => setSubjectId(e.target.value)}>
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
          onChange={handleFile}
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
          rows={8}
          value={rawText}
          onChange={e => { setRawText(e.target.value); setParsed(null) }}
          placeholder={`Question text here\noption one\ncorrect:option two\noption three\n\nNext question…`}
        />
      </div>

      {/* Parse button */}
      {!parsed && (
        <button className="btn-primary" onClick={handleParse}
                disabled={!rawText.trim() || !subjectId}>
          <Eye size={15} /> Parse &amp; Preview
        </button>
      )}

      {/* Preview */}
      {parsed && (
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
            <span className="text-sm font-semibold text-ink">
              {parsed.length} question{parsed.length !== 1 ? 's' : ''} ready
            </span>
            <button className="btn-ghost p-1" onClick={() => setParsed(null)}><X size={14} /></button>
          </div>

          <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
            {parsed.map((q, i) => (
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

          <div className="p-4 border-t border-surface-border flex flex-wrap justify-between items-center gap-2">
            <button className="btn-ghost text-sm" onClick={reset}>Start over</button>
            <button className="btn-success" onClick={handleImport} disabled={saving}>
              <Upload size={14} />
              {saving ? 'Importing…' : `Import ${parsed.length} Questions`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
