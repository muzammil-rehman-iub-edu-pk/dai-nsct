/**
 * Spinner — loading indicator.
 * Sizes: sm | md | lg | xl
 */
export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3',
    xl: 'w-16 h-16 border-4',
  }

  return (
    <div
      className={`animate-spin rounded-full border-ink-faint border-t-primary ${sizes[size] || sizes.md} ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

/**
 * PageSpinner — centered full-page loading state
 */
export function PageSpinner({ message = '' }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Spinner size="lg" />
      {message && <p className="text-sm text-ink-muted">{message}</p>}
    </div>
  )
}

/**
 * InlineSpinner — tiny inline loader for buttons / table cells
 */
export function InlineSpinner() {
  return <Spinner size="sm" className="inline-block" />
}
