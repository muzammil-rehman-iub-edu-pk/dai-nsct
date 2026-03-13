/**
 * Exam Engine
 * Handles weighted question selection, shuffling, and option randomization.
 */

/**
 * Fisher-Yates shuffle
 */
export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Build weighted question set from active subjects.
 *
 * @param {Array} subjectQuestions - [{subject_id, weightage, questions:[...]}]
 * @param {number} totalNeeded - total questions for exam (e.g. 100)
 * @returns {Array} selected question rows
 */
export function buildWeightedExam(subjectQuestions, totalNeeded) {
  // Calculate total weightage across active subjects that have questions
  const available = subjectQuestions.filter(s => s.questions.length > 0)
  if (!available.length) return []

  const totalWeight = available.reduce((sum, s) => sum + s.weightage, 0)

  // Allocate questions per subject based on weightage
  const allocations = available.map(s => ({
    ...s,
    allocated: Math.round((s.weightage / totalWeight) * totalNeeded)
  }))

  // Adjust rounding drift
  const allocTotal = allocations.reduce((sum, s) => sum + s.allocated, 0)
  const diff = totalNeeded - allocTotal
  if (diff !== 0 && allocations.length > 0) {
    allocations[0].allocated += diff
  }

  // Pick random questions per subject
  const selected = []
  for (const subj of allocations) {
    const pool = shuffle(subj.questions)
    selected.push(...pool.slice(0, Math.min(subj.allocated, pool.length)))
  }

  return shuffle(selected)
}

/**
 * Prepare a question for display: snapshot text, shuffle options,
 * track correct answer label.
 *
 * Raw DB format: option_a = correct answer, option_b–e = wrong
 * We shuffle and assign labels A–E, recording which label is correct.
 *
 * @param {Object} q - raw question row from DB
 * @param {number} order - question order in this exam
 * @returns {Object} snapshot ready for storage
 */
export function prepareQuestion(q, order) {
  const rawOptions = [
    { text: q.option_a, is_correct: true },
    { text: q.option_b, is_correct: false },
    { text: q.option_c, is_correct: false },
    { text: q.option_d, is_correct: false },
    { text: q.option_e, is_correct: false },
  ].filter(o => o.text && o.text.trim() !== '')

  const shuffled = shuffle(rawOptions)
  const labels = ['A', 'B', 'C', 'D', 'E']

  const options = shuffled.map((opt, i) => ({
    label: labels[i],
    text: opt.text,
    is_correct: opt.is_correct,
  }))

  return {
    question_id: q.id,
    question_text: q.question_text,
    options,
    question_order: order,
    selected_label: null,
    is_correct: null,
  }
}

/**
 * Calculate score from answered snapshot questions
 */
export function calculateScore(questions) {
  const total = questions.length
  const correct = questions.filter(q => q.is_correct === true).length
  const percent = total > 0 ? Math.round((correct / total) * 10000) / 100 : 0
  return { total, correct, percent }
}

/**
 * Parse bulk question upload text format:
 * Line 1: question text
 * Lines 2–6: options (first = correct)
 * Blank line = separator
 * EOF = end
 */
export function parseBulkQuestions(text) {
  const questions = []
  const blocks = text.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean)

  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) continue  // need at least question + 1 option

    const question_text = lines[0]
    const opts = lines.slice(1, 6)  // max 5 options

    questions.push({
      question_text,
      option_a: opts[0] || '',  // correct
      option_b: opts[1] || null,
      option_c: opts[2] || null,
      option_d: opts[3] || null,
      option_e: opts[4] || null,
    })
  }

  return questions
}
