import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

// A small panel under a button that can hold anything (a filter with a few controls). It closes on Escape or a
// click outside it, flips above when there is no room, and keeps inside the window.
export function Popover({ anchor, onClose, title, children }: { anchor: DOMRect; onClose: () => void; title?: string; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: anchor.left, top: anchor.bottom + 6 })

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const margin = 8
    const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - element.offsetWidth - margin)
    let top = anchor.bottom + 6
    if (top + element.offsetHeight > window.innerHeight - margin) top = Math.max(margin, anchor.top - element.offsetHeight - 6)
    setPosition({ left, top })
  }, [anchor])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onPointer)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onPointer)
    }
  }, [onClose])

  return (
    <div
      ref={box}
      role="dialog"
      aria-label={title}
      style={{ left: position.left, top: position.top }}
      className="fixed z-[60] max-h-[calc(100vh-16px)] w-[300px] max-w-[calc(100vw-24px)] overflow-y-auto rounded-ledger border border-paper-line bg-white p-3.5 shadow-lg"
    >
      {children}
    </div>
  )
}
