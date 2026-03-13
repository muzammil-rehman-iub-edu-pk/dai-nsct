import { useState, useRef } from 'react'
import { parseBulkQuestions } from '../../lib/examEngine'
import { supabase } from '../../lib/supabase'
import { Upload, FileText, CheckCircle, AlertTriangle, X, Eye } from 'lucide-react'

/**
 * BulkUploadParser
 *
 * Self-contained bulk question uploader.
 * Accepts a .txt file OR pasted text, parses it, shows a preview, then imports.
 *
 * Props:
 *   subjects  Array  — [{id, subject_name}]
 *   onImport  () => void  — called after successful import
 *   toast     fn  — from useToast
 */
export function BulkUploadParser({ subjects = [], onImport, toast }) {
  const [subjectId, setSubjectId] = useState('')
  const [rawText, setRawText]     = useState('')
  const [parsed, setParsed]       = useState(null)   // null | []
  const [saving, setSaving]       = useState(false)
  const [showPreview, setPreview] = useState(false)
  const fileRef                   = useRef()

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const text = await file.text()
    setRawText(text)
    setParsed(null)
  }

  function handleParse() {
    if (!subjectId) { toast?.('Please select a subject first', 'error'); return }
    if (!rawText.trim()) { toast?.('No text to parse', 'error'); return }
    const result = parseBulkQuestions(rawText)
    if (!result.length) { toast?.('No valid questions found. Check the format.', 'error'); return }
    setParsed(result)
  }

  async function handleImport() {
    if (!parsed?.length || !subjectId) return
    setSaving(true)
    try {
      const rows = parsed.map(q => ({ ...q, subject_id: subjectId }))
      const CHUNK = 100
      for (let i = 0; i < rows.length; i += CHUNK) {
        const { error } = await supabase.from('questions').insert(rows.slice(i, i + CHUNK))
        if (error) throw error
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
      <div className="p-4 rounded-xl bg-surface border border-surface-border">
        <p className="text-xs font-semibold text-ink mb-2 flex items-center gap-1.5">
          <FileText size={13} className="text-primary" /> Expected File Format (.txt)
        </p>
        <pre className="font-mono text-xs text-ink-muted whitespace-pre-wrap leading-relaxed">
{`What is the speed of light?
300,000 km/s
150,000 km/s
1,000 km/s
3,000 km/s

Who invented the telephone?
Alexander Graham Bell
Thomas Edison
Nikola Tesla
James Watt`}
        </pre>
        <p className="text-xs text-ink-muted mt-2">
          • First line = question text &nbsp;•&nbsp; Next lines = options (first option is CORRECT)
          &nbsp;•&nbsp; Blank line separates questions &nbsp;•&nbsp; Max 5 options per question
        </p>
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

      {/* Or paste */}
      <div>
        <label className="form-label">Or Paste Questions Text</label>
        <textarea
          className="form-input font-mono text-xs"
          rows={8}
          value={rawText}
          onChange={e => { setRawText(e.target.value); setParsed(null) }}
          placeholder="Paste your question text here…"
        />
      </div>

      {/* Parse button */}
      {!parsed && (
        <button className="btn-primary" onClick={handleParse} disabled={!rawText.trim() || !subjectId}>
          <Eye size={15} /> Parse & Preview
        </button>
      )}

      {/* Preview */}
      {parsed && (
        <div className="border border-surface-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface border-b border-surface-border">
            <div className="flex items-center gap-2 text-sm font-semibold text-ink">
              <CheckCircle size={15} className="text-success" />
              {parsed.length} questions ready to import
            </div>
            <button className="btn-ghost p-1" onClick={() => { setParsed(null) }}>
              <X size={14} />
            </button>
          </div>

          {/* Preview list */}
          <div className="max-h-52 overflow-y-auto divide-y divide-surface-border">
            {parsed.map((q, i) => (
              <div key={i} className="px-4 py-3">
                <p className="text-xs font-medium text-ink line-clamp-1">
                  {i + 1}. {q.question_text}
                </p>
                <p className="text-xs text-success mt-0.5">✓ {q.option_a}</p>
                {[q.option_b, q.option_c, q.option_d, q.option_e].filter(Boolean).map((opt, j) => (
                  <p key={j} className="text-xs text-ink-faint">• {opt}</p>
                ))}
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-surface-border flex justify-between items-center">
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
