import { Modal } from './Modal'
import { AlertTriangle, Info } from 'lucide-react'

/**
 * ConfirmDialog — reusable confirmation modal.
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   onConfirm   () => void
 *   title       string
 *   message     string | ReactNode
 *   danger      boolean  — red confirm button
 *   confirmLabel string  — defaults to "Confirm"
 *   cancelLabel  string  — defaults to "Cancel"
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  danger = false,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
}) {
  function handleConfirm() {
    onConfirm?.()
    onClose()
  }

  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        {/* Message area */}
        <div className="flex gap-3 items-start">
          {danger
            ? <AlertTriangle size={20} className="text-danger flex-shrink-0 mt-0.5" />
            : <Info          size={20} className="text-primary flex-shrink-0 mt-0.5"  />
          }
          <p className="text-sm text-ink-muted leading-relaxed">{message}</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button className="btn-outline" onClick={onClose}>
            {cancelLabel}
          </button>
          <button
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
