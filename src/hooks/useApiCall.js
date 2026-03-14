/**
 * useApiCall
 *
 * Wraps any async function with loading + error state.
 * Eliminates the setSaving(true) / try / finally / setSaving(false) boilerplate
 * that was scattered across every page.
 *
 * Usage:
 *   const { run, loading, error } = useApiCall()
 *   await run(async () => {
 *     const { error } = await supabase.from('teachers').insert(data)
 *     if (error) throw error
 *   })
 */

import { useState, useCallback } from 'react'

export function useApiCall() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const run = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      setError(err.message || 'An unexpected error occurred')
      throw err   // re-throw so callers can handle if needed
    } finally {
      setLoading(false)
    }
  }, [])

  return { run, loading, error, setError }
}
