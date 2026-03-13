/**
 * formatters.js — Display formatting utilities.
 */

/**
 * Format seconds to mm:ss string.
 * e.g. 3661 → "61:01"
 */
export function formatTimer(totalSeconds) {
  if (totalSeconds === null || totalSeconds === undefined) return '--:--'
  const secs = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

/**
 * Format seconds to human readable duration.
 * e.g. 3661 → "1h 1m 1s"
 */
export function formatDuration(totalSeconds) {
  if (!totalSeconds) return '—'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  const parts = []
  if (h) parts.push(`${h}h`)
  if (m) parts.push(`${m}m`)
  if (s || !parts.length) parts.push(`${s}s`)
  return parts.join(' ')
}

/**
 * Format a score percentage with fixed decimals.
 * e.g. 73.333 → "73.3%"
 */
export function formatScore(percent, decimals = 1) {
  if (percent === null || percent === undefined) return '—'
  return `${Number(percent).toFixed(decimals)}%`
}

/**
 * Format a date to a readable string.
 * e.g. "Mar 10, 2025"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

/**
 * Format a datetime to date + time.
 * e.g. "Mar 10, 2025 · 02:45 PM"
 */
export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }) + ' · ' + d.toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })
}

/**
 * Format a relative time string.
 * e.g. "3 days ago"
 */
export function formatRelative(dateStr) {
  if (!dateStr) return '—'
  const diff  = Date.now() - new Date(dateStr).getTime()
  const secs  = Math.floor(diff / 1000)
  const mins  = Math.floor(secs / 60)
  const hours = Math.floor(mins / 60)
  const days  = Math.floor(hours / 24)

  if (days > 30)  return formatDate(dateStr)
  if (days >= 1)  return `${days}d ago`
  if (hours >= 1) return `${hours}h ago`
  if (mins >= 1)  return `${mins}m ago`
  return 'Just now'
}

/**
 * Truncate a string with ellipsis.
 */
export function truncate(str, max = 60) {
  if (!str) return ''
  return str.length > max ? str.slice(0, max) + '…' : str
}

/**
 * Capitalize first letter.
 */
export function capitalize(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Format a number with commas. e.g. 12345 → "12,345"
 */
export function formatNumber(n) {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString()
}
