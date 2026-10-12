import { useState } from 'react'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { IconLink } from '../icons'

export interface WorkspaceTab {
  key: string
  // The name this viewer sees (their own, when they renamed it).
  name: string
  // Rows of this table are posted to the Cash book.
  posts?: boolean
}

// The sheet-style tab bar under the table: Cash book · Orders · Costs …
// The ▾ on the open tab holds Rename / Hide; ＋ brings hidden tables back.
export function WorkspaceTabs({
  tabs,
  activeKey,
  hidden,
  onSelect,
  menuFor,
  onShow,
}: {
  tabs: WorkspaceTab[]
  activeKey: string
  // Tables this viewer hid, by key and original name.
  hidden: { key: string; name: string }[]
  onSelect: (key: string) => void
  // The ▾ menu of a table.
  menuFor: (key: string) => MenuEntry[]
  onShow: (key: string) => void
}) {
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)

  return (
    <div role="tablist" aria-label="Tables" className="flex items-end gap-0.5 overflow-x-auto rounded-b-ledger border border-t-0 border-paper-line bg-paper-edge px-3 pt-2">
      {tabs.map((tab) => {
        const active = tab.key === activeKey
        return (
          <div
            key={tab.key}
            className={`flex items-center gap-1.5 rounded-t-[6px] border border-b-0 px-3.5 py-1.5 text-[13px] whitespace-nowrap ${
              active ? '-mb-px border-paper-line border-t-[3px] border-t-stamp bg-white font-bold text-ink' : 'border-transparent font-semibold text-ink-soft hover:bg-white'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onSelect(tab.key)}
              className="flex items-center gap-1.5"
            >
              {tab.posts && (
                <span className="text-brass" title="Posts to the Cash book">
                  <IconLink width={13} height={13} />
                </span>
              )}
              {tab.name}
            </button>
            {active && (
              <button
                type="button"
                aria-label={`${tab.name} options`}
                aria-haspopup="menu"
                onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: menuFor(tab.key) })}
                className="px-0.5 opacity-55 hover:opacity-100"
              >
                ▾
              </button>
            )}
          </div>
        )
      })}
      {hidden.length > 0 && (
        <button
          type="button"
          aria-label="Show a hidden table"
          title="Show a hidden table"
          aria-haspopup="menu"
          onClick={(event) =>
            setMenu({
              anchor: event.currentTarget.getBoundingClientRect(),
              items: hidden.map((table) => ({ label: `Show ${table.name}`, hint: 'Your rows are still there.', onSelect: () => onShow(table.key) })),
            })
          }
          className="rounded-t-[6px] px-3 py-1.5 text-[15px] font-semibold text-ink-soft hover:bg-white"
        >
          ＋
        </button>
      )}
      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
