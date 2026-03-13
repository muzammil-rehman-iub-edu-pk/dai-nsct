/**
 * Badge — status and label indicator pill.
 *
 * Variants: success | danger | accent | primary | secondary | muted | warning
 */
export function Badge({ children, variant = 'muted', className = '', dot = false }) {
  const variants = {
    success:   'badge-success',
    danger:    'badge-danger',
    accent:    'badge-accent',
    warning:   'bg-amber-100 text-amber-800',
    primary:   'badge-primary',
    secondary: 'bg-secondary/10 text-secondary-dark',
    muted:     'badge-muted',
  }

  return (
    <span className={`badge ${variants[variant] || variants.muted} ${className}`}>
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block
          ${variant === 'success' ? 'bg-success' :
            variant === 'danger'  ? 'bg-danger'  :
            variant === 'accent'  ? 'bg-accent'  :
            variant === 'warning' ? 'bg-amber-500' :
            'bg-current opacity-60'}`}
        />
      )}
      {children}
    </span>
  )
}

/**
 * ScoreBadge — automatically colors based on score percentage
 */
export function ScoreBadge({ score }) {
  const variant = score >= 70 ? 'success' : score >= 50 ? 'accent' : 'danger'
  return <Badge variant={variant}>{typeof score === 'number' ? `${score.toFixed(1)}%` : score}</Badge>
}

/**
 * ActiveBadge — shows Active / Inactive status
 */
export function ActiveBadge({ active }) {
  return <Badge variant={active ? 'success' : 'danger'} dot>{active ? 'Active' : 'Inactive'}</Badge>
}

/**
 * RoleBadge — shows user role
 */
export function RoleBadge({ role }) {
  const map = { admin: 'danger', teacher: 'secondary', student: 'primary' }
  return <Badge variant={map[role] || 'muted'} className="capitalize">{role}</Badge>
}
