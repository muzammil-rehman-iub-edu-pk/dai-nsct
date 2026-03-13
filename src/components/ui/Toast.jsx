import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react'

const CONFIG = {
  success: { icon: CheckCircle, classes: 'border-success/20 bg-success/5',  iconClass: 'text-success'  },
  error:   { icon: XCircle,     classes: 'border-danger/20 bg-danger/5',    iconClass: 'text-danger'   },
  warning: { icon: AlertTriangle, classes: 'border-accent/20 bg-accent/5',  iconClass: 'text-accent'   },
  info:    { icon: Info,        classes: 'border-primary/20 bg-primary/5',  iconClass: 'text-primary'  },
}

function Toast({ message, type = 'info', onDismiss }) {
  const cfg  = CONFIG[type] || CONFIG.info
  const Icon = cfg.icon

  return (
    <div className={`fade-up flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lift
                     text-sm font-body text-ink min-w-[260px] max-w-sm ${cfg.classes}`}>
      <Icon size={16} className={`${cfg.iconClass} flex-shrink-0 mt-0.5`} />
      <span className="flex-1 leading-snug">{message}</span>
      <button
        onClick={onDismiss}
        className="text-ink-faint hover:text-ink transition-colors mt-0.5 flex-shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * ToastContainer — render this once at the app root (or layout level).
 * Pass toasts and dismiss from useToast().
 */
export function ToastContainer({ toasts = [], dismiss }) {
  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map(t => (
        <Toast
          key={t.key}
          message={t.message}
          type={t.type}
          onDismiss={() => dismiss(t.key)}
        />
      ))}
    </div>
  )
}
