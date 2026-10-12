import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  // A second, smaller line.
  hint?: string
  disabled?: boolean
  onSelect?: () => void
}

export type MenuEntry = MenuItem | 'separator'

// A small menu opened from a button (column header, tab ▾, Columns). It sits
// under the anchor, flips above when there is no room, closes on Escape or a
// click outside, and moves with the arrow keys.
export function FloatingMenu({
  anchor,
  items,
  onClose,
}: {
  anchor: DOMRect
  items: MenuEntry[]
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{ left: number; top: number }>({ left: anchor.left, top: anchor.bottom + 6 })

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const margin = 8
    const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - element.offsetWidth - margin)
    let top = anchor.bottom + 6
    if (top + element.offsetHeight > window.innerHeight - margin) {
      top = Math.max(margin, anchor.top - element.offsetHeight - 6)
    }
    setPosition({ left, top })
  }, [anchor])

  useEffect(() => {
    const buttons = () => Array.from(box.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])') ?? [])
    buttons()[0]?.focus()
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const list = buttons()
        if (list.length === 0) return
        const index = list.indexOf(document.activeElement as HTMLButtonElement)
        const next = (index + (event.key === 'ArrowDown' ? 1 : -1) + list.length) % list.length
        list[next].focus()
        event.preventDefault()
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
      role="menu"
      style={{ left: position.left, top: position.top }}
      className="fixed z-[60] max-w-[calc(100vw-24px)] min-w-[210px] rounded-ledger border border-paper-line bg-white p-1.5 shadow-lg"
    >
      {items.map((item, index) =>
        item === 'separator' ? (
          <hr key={`sep-${index}`} className="my-1 border-0 border-t border-paper-edge" />
        ) : (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onSelect?.()
            }}
            className="flex w-full flex-col rounded-[6px] px-2.5 py-1.5 text-left text-[13.5px] font-semibold enabled:hover:bg-stamp-soft disabled:cursor-not-allowed disabled:text-ink-soft/70"
          >
            {item.label}
            {item.hint && <span className="text-xs font-normal text-ink-soft">{item.hint}</span>}
          </button>
        ),
      )}
    </div>
  )
}
