import { Button } from './Button'

export function ConfirmDialog({
  title,
  body,
  confirmLabel = 'Delete',
  isPending,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel?: string
  isPending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onCancel}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-paper p-7 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-2 font-display text-xl font-semibold">{title}</h2>
        <p className="mb-6 text-sm text-ink-soft">{body}</p>
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Deleting…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
