import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ToastContext, type ShowToast, type ToastOptions } from '../lib/toast-context'

interface ToastItem extends ToastOptions {
  id: number
  message: string
}

const SHORT_MS = 3800
const UNDO_MS = 7000
const MAX_VISIBLE = 3

// Small messages at the bottom of the screen ("Row deleted. Undo"). Nothing in
// them is the only way to learn something: errors also show where they happened.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(1)
  const timers = useRef(new Map<number, number>())

  const dismiss = useCallback((id: number) => {
    window.clearTimeout(timers.current.get(id))
    timers.current.delete(id)
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const show = useCallback<ShowToast>(
    (message, options) => {
      const id = nextId.current++
      setItems((current) => [...current, { id, message, undo: options?.undo }].slice(-MAX_VISIBLE))
      timers.current.set(id, window.setTimeout(() => dismiss(id), options?.undo ? UNDO_MS : SHORT_MS))
    },
    [dismiss],
  )

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => window.clearTimeout(timer))
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex w-max max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex items-center gap-4 rounded-ledger bg-ink px-3.5 py-2.5 text-[13.5px] text-white shadow-lg"
          >
            <span>{item.message}</span>
            {item.undo && (
              <button
                type="button"
                className="font-bold underline"
                onClick={() => {
                  item.undo?.()
                  dismiss(item.id)
                }}
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
