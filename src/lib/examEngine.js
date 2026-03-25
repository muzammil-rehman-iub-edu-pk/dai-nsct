/**
 * examEngine.js
 * Handles weighted question selection, option shuffling, scoring,
 * and bulk question text parsing.
 *
 * DATABASE CONTRACT (unchanged):
 *   option_a  = the correct answer
 *   option_b–e = wrong answers (nullable)
 *
 * The form and bulk parser both normalise to this contract before saving.
 */

// ─── Fisher-Yates shuffle ────────────────────────────────────────────────────
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── Weighted exam builder ───────────────────────────────────────────────────
export function buildWeightedExam(subjectQuestions, totalNeeded) {
  const available = subjectQuestions.filter(s => s.questions.length > 0)
  if (!available.length) return []

  const totalWeight = available.reduce((sum, s) => sum + s.weightage, 0)
  const allocations = available.map(s => ({
    ...s,
    allocated: Math.round((s.weightage / totalWeight) * totalNeeded),
  }))

  // Fix rounding drift on the largest subject
  const allocTotal = allocations.reduce((sum, s) => sum + s.allocated, 0)
  const diff = totalNeeded - allocTotal
  if (diff !== 0 && allocations.length > 0) {
    const largest = allocations.reduce((a, b) => a.allocated >= b.allocated ? a : b)
    largest.allocated += diff
  }

  // First pass: pick up to allocated per subject
  const selected = []
  let shortage = 0
  for (const subj of allocations) {
    const pool = shuffle(subj.questions)
    const take = Math.min(subj.allocated, pool.length)
    selected.push(...pool.slice(0, take))
    shortage += subj.allocated - take  // track how many we couldn't fill
  }

  // Second pass: fill shortage from subjects that have spare questions
  if (shortage > 0) {
    for (const subj of allocations) {
      if (shortage <= 0) break
      const alreadyTaken = Math.min(subj.allocated, subj.questions.length)
      const spare = subj.questions.length - alreadyTaken
      if (spare <= 0) continue
      const extra = shuffle(subj.questions.slice(alreadyTaken))
      const take = Math.min(spare, shortage)
      selected.push(...extra.slice(0, take))
      shortage -= take
    }
  }

  return shuffle(selected)
}

// ─── Prepare question for exam snapshot ──────────────────────────────────────
/**
 * Takes a raw DB question row (option_a = correct) and returns an exam
 * snapshot object with options shuffled into random positions.
 */
export function prepareQuestion(q, order) {
  const rawOptions = [
    { text: q.option_a, is_correct: true  },
    { text: q.option_b, is_correct: false },
    { text: q.option_c, is_correct: false },
    { text: q.option_d, is_correct: false },
    { text: q.option_e, is_correct: false },
  ].filter(o => o.text && o.text.trim() !== '')

  const shuffled = shuffle(rawOptions)
  const labels   = ['A', 'B', 'C', 'D', 'E']

  return {
    question_id:    q.id,
    question_text:  q.question_text,
    options:        shuffled.map((opt, i) => ({ label: labels[i], text: opt.text, is_correct: opt.is_correct })),
    question_order: order,
    selected_label: null,
    is_correct:     null,
  }
}

// ─── Score calculator ────────────────────────────────────────────────────────
export function calculateScore(questions) {
  const total   = questions.length
  const correct = questions.filter(q => q.is_correct === true).length
  const percent = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0
  return { total, correct, percent }
}

// ─── Bulk question text parser ───────────────────────────────────────────────
/**
 * FORMAT:
 *
 *   This is a question text.
 *   first option
 *   correct:second option
 *   third option
 *
 *   Another question.
 *   wrong one
 *   wrong two
 *   correct:right answer
 *   wrong three
 *
 * Rules:
 *   • First non-blank line = question text
 *   • Remaining lines      = options (2–5). Prefix the correct one with "correct:"
 *   • "correct:" is case-insensitive, e.g. "Correct:Paris" also works
 *   • If NO option has "correct:" prefix, the first option is assumed correct
 *     (backward-compatible with any existing upload files)
 *   • The "correct:" prefix is stripped before storing
 *   • Blank line separates questions
 *
 * Output always stores the correct answer as option_a (DB contract).
 */
export function parseBulkQuestions(text) {
  const questions      = []
  const correctPrefixRe = /^correct\s*:/i
  const blocks         = text.split(/\n[ \t]*\n/).map(b => b.trim()).filter(Boolean)

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue   // need at least question + 1 option

    const question_text = lines[0]
    const optionLines   = lines.slice(1, 6)   // max 5 options
    if (!optionLines.length) continue

    // Find which line is prefixed with "correct:"
    const correctIdx = optionLines.findIndex(l => correctPrefixRe.test(l))
    const resolvedIdx = correctIdx !== -1 ? correctIdx : 0   // default: first option

    // Strip the "correct:" prefix from the matched line
    const cleanOptions = optionLines.map((l, i) =>
      i === resolvedIdx ? l.replace(correctPrefixRe, '').trim() : l
    )

    // Rotate so the correct answer sits at index 0 → option_a in DB
    const rotated = [
      cleanOptions[resolvedIdx],
      ...cleanOptions.slice(0, resolvedIdx),
      ...cleanOptions.slice(resolvedIdx + 1),
    ]

    questions.push({
      question_text,
      option_a: rotated[0] || '',
      option_b: rotated[1] || null,
      option_c: rotated[2] || null,
      option_d: rotated[3] || null,
      option_e: rotated[4] || null,
    })
  }

  return questions
}
