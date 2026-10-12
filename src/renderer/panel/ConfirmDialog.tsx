import { useEffect } from 'react'

export function ConfirmDialog({
  title,
  body,
  confirmText,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal card confirm" role="alertdialog" aria-modal="true" onClick={e => e.stopPropagation()}>
        <h2>{title}</h2>
        <p className="hint confirm-body">{body}</p>
        <div className="row modal-actions">
          <button className="ghost" onClick={onCancel}>
            再想想
          </button>
          <button onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  )
}
