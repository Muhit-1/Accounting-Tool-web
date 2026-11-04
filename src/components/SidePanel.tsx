import { useEffect, useRef, type ReactNode } from 'react'
import { IconClose } from './icons'

// A panel that slides in from the right, next to the page (column settings, history …). Escape or the × closes it;
// a click on the page behind it closes it too. Keeps keyboard focus inside while open.
export function SidePanel({ title, onClose, children, footer, width = 420 }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: number }) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('input:not([type=hidden]), select, textarea')?.focus()
    return () => before?.focus?.()
  }, [])

  return (
    <div className="fixed inset-x-0 top-14 bottom-0 z-40">
      <div className="absolute inset-0 bg-ink/20" onClick={onClose} aria-hidden />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation()
            onClose()
          }
        }}
        style={{ width }}
        className="absolute inset-y-0 right-0 flex max-w-full flex-col border-l border-paper-line bg-white shadow-[-8px_0_28px_rgba(15,42,74,0.14)]"
      >
        <div className="flex flex-none items-center justify-between border-b border-paper-edge px-5 py-3.5">
          <h2 className="font-display text-[17px] font-bold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-paper">
            <IconClose width={20} height={20} />
          </button>
        </div>
        <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex flex-none items-center justify-end gap-3 border-t border-paper-edge bg-white px-5 py-3.5">{footer}</div>}
      </div>
    </div>
  )
}
