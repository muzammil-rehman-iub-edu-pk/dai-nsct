import { useState, useCallback } from 'react'

let _id = 0

/**
 * useToast — lightweight toast notification hook.
 *
 * Usage:
 *   const { toasts, toast, dismiss } = useToast()
 *   toast('Saved!', 'success')
 *   toast('Something went wrong', 'error')
 *   toast('Please note...', 'warning')
 *   toast('FYI', 'info')
 */
export function useToast() {
  const [toasts, setToasts] = useState([])

  const toast = useCallback((message, type = 'info', duration = 3500) => {
    const key = ++_id
    setToasts(t => [...t, { key, message, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.key !== key)), duration)
    return key
  }, [])

  const dismiss = useCallback((key) => {
    setToasts(t => t.filter(x => x.key !== key))
  }, [])

  const dismissAll = useCallback(() => setToasts([]), [])

  return { toasts, toast, dismiss, dismissAll }
}
