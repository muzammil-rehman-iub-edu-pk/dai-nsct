/**
 * useExam — hook for managing live exam state.
 * Handles answer saving, progress tracking, and auto-save to Supabase.
 */

import { useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

/**
 * @param {string} attemptId - UUID of the current exam attempt
 * @param {Array}  questions  - snapshot question rows from DB
 */
export function useExam(attemptId, questions) {
  const [answers, setAnswers]       = useState({})   // { snapshotId: selectedLabel }
  const [currentIndex, setIndex]    = useState(0)
  const [saving, setSaving]         = useState(false)
  const saveQueue                   = useRef({})
  const saveTimer                   = useRef(null)

  // Debounced save to Supabase — batches rapid answer changes
  const flushSave = useCallback(async () => {
    const batch = { ...saveQueue.current }
    saveQueue.current = {}
    if (!Object.keys(batch).length) return

    setSaving(true)
    try {
      await Promise.all(
        Object.entries(batch).map(([snapshotId, label]) =>
          supabase
            .from('exam_question_snapshots')
            .update({ selected_label: label })
            .eq('id', snapshotId)
        )
      )
    } catch (err) {
      console.error('Auto-save error:', err)
    } finally {
      setSaving(false)
    }
  }, [])

  /**
   * Record an answer for a question snapshot.
   * Updates local state immediately; queues a debounced DB save.
   */
  const recordAnswer = useCallback((snapshotId, label) => {
    setAnswers(prev => ({ ...prev, [snapshotId]: label }))
    saveQueue.current[snapshotId] = label

    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(flushSave, 800)
  }, [flushSave])

  /**
   * Navigate to a specific question index.
   */
  const goTo = useCallback((index) => {
    setIndex(Math.max(0, Math.min(index, questions.length - 1)))
  }, [questions.length])

  const goNext = useCallback(() => goTo(currentIndex + 1), [currentIndex, goTo])
  const goPrev = useCallback(() => goTo(currentIndex - 1), [currentIndex, goTo])

  /**
   * Derived stats
   */
  const answeredCount   = Object.keys(answers).length
  const totalCount      = questions.length
  const progressPercent = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0
  const currentQuestion = questions[currentIndex] || null
  const isFirst         = currentIndex === 0
  const isLast          = currentIndex === totalCount - 1

  /**
   * Check if a specific question has been answered
   */
  const isAnswered = useCallback((snapshotId) => !!answers[snapshotId], [answers])

  /**
   * Force flush any pending saves (call before submitting)
   */
  const forceSave = useCallback(async () => {
    clearTimeout(saveTimer.current)
    await flushSave()
  }, [flushSave])

  return {
    answers,
    currentIndex,
    currentQuestion,
    saving,
    answeredCount,
    totalCount,
    progressPercent,
    isFirst,
    isLast,
    recordAnswer,
    goTo,
    goNext,
    goPrev,
    isAnswered,
    forceSave,
  }
}
