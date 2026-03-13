import { Spinner } from './Spinner'

/**
 * Button — polymorphic button component with variant support.
 *
 * Variants: primary | secondary | ghost | danger | success | accent | outline
 * Sizes:    sm | md | lg
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconRight,
  className = '',
  as: Tag = 'button',
  ...props
}) {
  const variants = {
    primary:   'btn-primary',
    secondary: 'btn-secondary',
    ghost:     'btn-ghost',
    danger:    'btn-danger',
    success:   'btn-success',
    accent:    'btn-accent',
    outline:   'btn-outline',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const base = variants[variant] || variants.primary
  const sz   = sizes[size] || sizes.md

  return (
    <Tag
      className={`${base} ${sz} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Spinner size="sm" className="mr-1" />
      ) : icon ? (
        <span className="flex-shrink-0">{icon}</span>
      ) : null}
      {children}
      {iconRight && !loading && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </Tag>
  )
}
