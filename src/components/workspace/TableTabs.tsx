import { useRef, useState } from 'react'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { IconLink } from '../icons'

export interface TabInfo {
  key: string
  name: string
  color?: string | null
  // Rows of this table are posted to the Cash book.
  posts?: boolean
  // The Cash book: its balance is locked.
  ledger?: boolean
  // Can be dragged to a new place.
  movable?: boolean
}

// Every table of the business, in one bar on top. The ▾ on the open tab holds its own actions;
// ＋ makes a new table. Drag a tab to put it somewhere else.
export function TableTabs({
  tabs,
  activeKey,
  onSelect,
  menuFor,
  onNew,
  onMove,
}: {
  tabs: TabInfo[]
  activeKey: string
  onSelect: (key: string) => void
  menuFor: (key: string) => MenuEntry[]
  // Left out for someone who may not make tables: then there is no ＋.
  onNew?: (anchor: DOMRect) => void
  // Called with the new order of the movable tabs' keys.
  onMove: (keys: string[]) => void
}) {
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)
  const [over, setOver] = useState<string | null>(null)
  const dragging = useRef<string | null>(null)

  function drop(targetKey: string) {
    const from = dragging.current
    dragging.current = null
    setOver(null)
    if (!from || from === targetKey) return
    const keys = tabs.map((t) => t.key)
    keys.splice(keys.indexOf(from), 1)
    keys.splice(keys.indexOf(targetKey), 0, from)
    onMove(keys)
  }

  return (
    <div role="tablist" aria-label="Tables" className="flex items-end gap-0.5 overflow-x-auto border-b border-paper-line px-1 pt-1">
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <div
            key={tab.key}
            draggable={tab.movable}
            onDragStart={(event) => {
              dragging.current = tab.key
              event.dataTransfer.effectAllowed = 'move'
              event.dataTransfer.setData('text/plain', tab.key)
            }}
            onDragOver={(event) => {
              if (dragging.current && tab.movable) {
                event.preventDefault()
                setOver(tab.key)
              }
            }}
            onDragLeave={() => setOver((cur) => (cur === tab.key ? null : cur))}
            onDrop={(event) => {
              event.preventDefault()
              drop(tab.key)
            }}
            onDragEnd={() => {
              dragging.current = null
              setOver(null)
            }}
            style={{ ['--tab' as string]: tab.color ?? 'var(--color-stamp)' }}
            className={`flex items-center gap-1.5 rounded-t-[8px] border border-b-0 px-3 py-2 text-[13.5px] whitespace-nowrap ${
              active ? '-mb-px border-paper-line border-t-[3px] border-t-[var(--tab)] bg-white font-bold text-ink' : 'border-transparent font-semibold text-ink-soft hover:bg-white'
            } ${over === tab.key ? 'outline-2 outline-dashed outline-stamp' : ''}`}
          >
            <button type="button" role="tab" aria-selected={active} onClick={() => onSelect(tab.key)} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--tab)]" aria-hidden />
              {tab.name}
              {tab.posts && (
                <span className="text-brass" title="Posts to the Cash book">
                  <IconLink width={13} height={13} />
                </span>
              )}
              {tab.ledger && <span title="The balance is locked">🔒</span>}
            </button>
            {active && menuFor(tab.key).length > 0 && (
              <button
                type="button"
                aria-label={`${tab.name} options`}
                aria-haspopup="menu"
                onClick={(event) => {
                  const items = menuFor(tab.key)
                  if (items.length) setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items })
                }}
                className="px-0.5 opacity-55 hover:opacity-100"
              >
                ▾
              </button>
            )}
          </div>
        )
      })}
      {onNew && (
        <button
          type="button"
          aria-label="New table"
          title="New table"
          aria-haspopup="menu"
          onClick={(event) => onNew(event.currentTarget.getBoundingClientRect())}
          className="rounded-t-[8px] px-3 py-2 text-[16px] font-semibold text-ink-soft hover:bg-white"
        >
          ＋
        </button>
      )}
      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
