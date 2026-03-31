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

/**
 * parseRegNumber — extracts sortable components from IUB reg number.
 *
 * Pattern: [S|F][YY][Campus][Dept][Program][Shift][Prefix][Serial]
 * Example: S23BARIN1M01037
 *
 * Sort priority:
 *   1. Year (ascending)
 *   2. Semester within year: Spring (S) before Fall (F)
 *   3. Program number (1=BS Morning, 2=BS Evening, 7=ADP)
 *   4. Shift: Morning (M) before Evening (E)
 *   5. Serial (ascending)
 */
export function parseRegNumber(reg) {
  if (!reg || typeof reg !== 'string') return null
  // Match: semester(S/F), year(2 digits), campus+dept(variable), program(digit), shift(M/E), prefix(2 digits), serial(3 digits)
  const m = reg.match(/^([SF])(\d{2})[A-Z]+(\d)([ME])\d{2}(\d{3})/)
  if (!m) return null
  const [, semester, year, program, shift, serial] = m
  return {
    year:     parseInt(year, 10),
    semester: semester === 'S' ? 0 : 1,   // Spring=0 (first), Fall=1 (second)
    program:  parseInt(program, 10),       // 1=BS Morning, 2=BS Evening, 7=ADP
    shift:    shift === 'M' ? 0 : 1,       // Morning=0, Evening=1
    serial:   parseInt(serial, 10),
  }
}

/**
 * compareRegNumbers — comparator for sorting by reg number.
 * Returns negative/zero/positive like Array.sort comparator.
 */
export function compareRegNumbers(a, b) {
  const pa = parseRegNumber(a)
  const pb = parseRegNumber(b)
  // Unparseable reg numbers fall to the end
  if (!pa && !pb) return a.localeCompare(b)
  if (!pa) return 1
  if (!pb) return -1
  return (
    pa.year     - pb.year     ||
    pa.semester - pb.semester ||
    pa.program  - pb.program  ||
    pa.shift    - pb.shift    ||
    pa.serial   - pb.serial
  )
}

/**
 * parseSectionName — extracts sortable components from IUB section name.
 *
 * Pattern: BSARIN-[Semester]TH-[Number][Shift]
 * Example: BSARIN-7TH-1M
 *
 * Sort priority:
 *   1. Semester number (ascending — lower semester first)
 *   2. Section number (1 < 2 < 3)
 *   3. Shift: Morning (M) before Evening (E)
 */
export function parseSectionName(name) {
  if (!name || typeof name !== 'string') return null
  const m = name.match(/(\d+)TH-(\d+)([ME])/i)
  if (!m) return null
  return {
    semester: parseInt(m[1], 10),
    number:   parseInt(m[2], 10),
    shift:    m[3].toUpperCase() === 'M' ? 0 : 1,
  }
}

/**
 * compareSectionNames — comparator for sorting by section name.
 */
export function compareSectionNames(a, b) {
  const pa = parseSectionName(a)
  const pb = parseSectionName(b)
  if (!pa && !pb) return a.localeCompare(b)
  if (!pa) return 1
  if (!pb) return -1
  return (
    pa.semester - pb.semester ||
    pa.shift    - pb.shift    ||
    pa.number   - pb.number   
  )
}
