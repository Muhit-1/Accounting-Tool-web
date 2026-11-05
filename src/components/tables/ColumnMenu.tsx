import { useState } from 'react'
import type { FieldType } from '../../types/engine'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { IconChevronDown, IconPlus } from '../icons'

// "＋ Column": every way to add a column in one menu. A column is either typed by you or worked out for the whole
// column; there is no way to make a formula in one cell. The panel beside the sheet does the rest.
export function ColumnMenu({ onPick, onAddSummary }: { onPick: (type: FieldType) => void; onAddSummary: () => void }) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const typed: [string, FieldType][] = [
    ['Text', 'TEXT'],
    ['Number', 'NUMBER'],
    ['Money', 'MONEY'],
    ['Date', 'DATE'],
    ['Choice', 'CHOICE'],
    ['Tick box', 'TICK'],
  ]
  const items: MenuEntry[] = [
    { heading: 'Typed by you' },
    ...typed.map(([label, type]) => ({ label, onSelect: () => onPick(type) }) as MenuEntry),
    { heading: 'Worked out for the whole column' },
    { label: 'Formula', hint: 'One formula for the whole column.', onSelect: () => onPick('FORMULA') },
    { label: 'Link to a table', hint: 'Connect rows to another table.', onSelect: () => onPick('LINK') },
    { label: 'Look up', hint: 'Show a value from a linked row.', onSelect: () => onPick('LOOKUP') },
    { label: 'Roll up', hint: 'Add up the rows that link here.', onSelect: () => onPick('ROLLUP') },
    { label: 'Auto number', hint: 'A running number, like INV-0001.', onSelect: () => onPick('AUTO') },
    'separator',
    { label: 'Add a summary row', hint: 'A row under the table that adds up a column.', onSelect: onAddSummary },
  ]
  return (
    <>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={anchor !== null}
        onClick={(event) => setAnchor(event.currentTarget.getBoundingClientRect())}
        className="inline-flex h-8 items-center gap-1.5 rounded-ledger border border-paper-line bg-white px-3 text-[13px] font-medium text-ink hover:bg-paper"
      >
        <IconPlus width={15} height={15} />
        Column
        <IconChevronDown width={14} height={14} className="text-ink-soft" />
      </button>
      {anchor && <FloatingMenu anchor={anchor} items={items} onClose={() => setAnchor(null)} />}
    </>
  )
}
