import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  // A second, smaller line.
  hint?: string
  disabled?: boolean
  // A coloured dot before the label (a table colour).
  swatch?: string
  // A check mark after the label (the current choice).
  checked?: boolean
  // Shown in red: a delete.
  danger?: boolean
  onSelect?: () => void
}

// A small grey line that names the group of items under it.
export interface MenuHeading {
  heading: string
}

export type MenuEntry = MenuItem | MenuHeading | 'separator'

// A small menu opened from a button (column header, tab ⋮, Data). It sits
// under the anchor, flips above when there is no room, closes on Escape or a
// click outside, and moves with the arrow keys. It can also open at the mouse (right click):
// give it a zero-size anchor at the pointer.
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
      className="fixed z-[60] max-h-[calc(100vh-16px)] max-w-[calc(100vw-24px)] min-w-[220px] overflow-y-auto rounded-ledger border border-paper-line bg-white p-1.5 shadow-lg"
    >
      {items.map((item, index) => {
        if (item === 'separator') return <hr key={`sep-${index}`} className="my-1 border-0 border-t border-paper-edge" />
        if ('heading' in item) {
          return (
            <div key={`head-${index}`} className="px-2.5 pt-2 pb-1 text-[10.5px] font-bold tracking-wider text-ink-soft uppercase">
              {item.heading}
            </div>
          )
        }
        return (
          <button
            key={`${item.label}-${index}`}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => {
              onClose()
              item.onSelect?.()
            }}
            className={`flex w-full items-center gap-2.5 rounded-[6px] px-2.5 py-1.5 text-left text-[13.5px] font-semibold enabled:hover:bg-stamp-soft disabled:cursor-not-allowed disabled:text-ink-soft/70 ${item.danger ? 'text-rust enabled:hover:bg-rust-soft' : ''}`}
          >
            {item.swatch && <span aria-hidden className="h-3 w-3 flex-none rounded-full" style={{ background: item.swatch }} />}
            <span className="flex min-w-0 flex-1 flex-col">
              {item.label}
              {item.hint && <span className="text-xs font-normal text-ink-soft">{item.hint}</span>}
            </span>
            {item.checked && (
              <span aria-label="current" className="flex-none text-stamp">
                ✓
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
