import { useRef, useState } from 'react'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { IconLink, IconLock, IconPlus } from '../icons'

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

// Every sheet of the business, in one bar on top. Each tab has its own ⋮ menu (always on the open tab, on hover for
// the others) and a right click opens the same menu. A double click renames. “New sheet” is a button you cannot miss.
// Drag a tab to put it somewhere else.
export function TableTabs({
  tabs,
  activeKey,
  onSelect,
  menuFor,
  onNew,
  onMove,
  onRename,
}: {
  tabs: TabInfo[]
  activeKey: string
  onSelect: (key: string) => void
  menuFor: (key: string) => MenuEntry[]
  // Left out for someone who may not make sheets: then there is no “New sheet”.
  onNew?: (anchor: DOMRect) => void
  // Called with the new order of the movable tabs' keys.
  onMove: (keys: string[]) => void
  // A double click on a tab.
  onRename?: (key: string) => void
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
    <div role="tablist" aria-label="Sheets" className="flex items-end gap-0.5 overflow-x-auto border-b border-paper-line bg-paper px-3 pt-1.5">
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        const hasMenu = menuFor(tab.key).length > 0
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
            onContextMenu={(event) => {
              const items = menuFor(tab.key)
              if (items.length === 0) return
              event.preventDefault()
              setMenu({ anchor: new DOMRect(event.clientX, event.clientY, 0, 0), items })
            }}
            style={{ ['--tab' as string]: tab.color ?? 'var(--color-stamp)' }}
            className={`group/tab flex items-center gap-1 rounded-t-[8px] border border-b-0 py-1.5 pr-1 pl-3 text-[13.5px] whitespace-nowrap ${
              active ? '-mb-px border-paper-line border-t-[3px] border-t-[var(--tab)] bg-white font-bold text-ink' : 'border-transparent font-semibold text-ink-soft hover:bg-white'
            } ${over === tab.key ? 'outline-2 outline-dashed outline-stamp' : ''}`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.key)}
              onDoubleClick={() => onRename?.(tab.key)}
              className="flex items-center gap-1.5 py-0.5"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--tab)]" aria-hidden />
              {tab.name}
              {tab.posts && (
                <span className="text-brass" title="Posts to the Cash book">
                  <IconLink width={13} height={13} />
                </span>
              )}
              {tab.ledger && (
                <span className="text-brass" title="The balance is locked">
                  <IconLock width={12} height={12} />
                </span>
              )}
            </button>
            {hasMenu && (
              <button
                type="button"
                aria-label={`${tab.name} menu`}
                aria-haspopup="menu"
                title="Rename, delete and more"
                onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: menuFor(tab.key) })}
                className={`flex h-6 w-6 items-center justify-center rounded-md text-ink-soft hover:bg-stamp-soft hover:text-ink focus-visible:opacity-100 ${
                  active ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="5" r="1.7" />
                  <circle cx="12" cy="12" r="1.7" />
                  <circle cx="12" cy="19" r="1.7" />
                </svg>
              </button>
            )}
          </div>
        )
      })}
      {onNew && (
        <button
          type="button"
          data-new-sheet
          aria-haspopup="menu"
          onClick={(event) => onNew(event.currentTarget.getBoundingClientRect())}
          className="mb-1 ml-2 inline-flex flex-none items-center gap-1.5 self-center rounded-ledger border-[1.5px] border-stamp bg-stamp-soft px-3 py-1 text-[13px] font-bold text-stamp hover:bg-stamp hover:text-white"
        >
          <IconPlus width={14} height={14} />
          New sheet
        </button>
      )}
      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
