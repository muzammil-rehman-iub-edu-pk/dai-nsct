import { forwardRef } from 'react'

/**
 * Input — styled form input with optional label, error, and icon support.
 */
export const Input = forwardRef(function Input(
  {
    label,
    error,
    hint,
    icon,
    iconRight,
    className = '',
    wrapperClassName = '',
    type = 'text',
    required,
    ...props
  },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint pointer-events-none">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          type={type}
          className={`form-input
            ${icon ? 'pl-9' : ''}
            ${iconRight ? 'pr-9' : ''}
            ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
            ${className}`}
          {...props}
        />
        {iconRight && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint">
            {iconRight}
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
})

/**
 * Textarea variant
 */
export const Textarea = forwardRef(function Textarea(
  { label, error, hint, className = '', wrapperClassName = '', required, rows = 3, ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        rows={rows}
        className={`form-input resize-y
          ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
          ${className}`}
        {...props}
      />
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
})

/**
 * Select variant
 */
export const Select = forwardRef(function Select(
  { label, error, hint, className = '', wrapperClassName = '', required, children, ...props },
  ref
) {
  return (
    <div className={`flex flex-col gap-1 ${wrapperClassName}`}>
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`form-input
          ${error ? 'border-danger focus:border-danger focus:ring-danger/30' : ''}
          ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <p className="form-error">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-muted">{hint}</p>}
    </div>
  )
})
