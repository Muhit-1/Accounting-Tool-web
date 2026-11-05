import { cellText } from '../../lib/table-grid'
import { explainField, nameBoxText } from '../../lib/formula-bar'
import type { EngineRow, EngineTable, TableField } from '../../types/engine'
import type { ActiveCell } from '../grid/grid-types'

// Under the toolbar, like the formula bar of a spreadsheet: which column and row the cursor is in, and what is in it.
// Never a cell address: it says "Subtotal · row 3". A worked-out column shows how it is worked out, with column names.
// There are no single-cell formulas: a formula belongs to the whole column.
export function FormulaBar({
  table,
  tables,
  active,
  canDesign,
  onEditField,
}: {
  table: EngineTable
  tables: EngineTable[]
  active: ActiveCell<EngineRow> | null
  canDesign: boolean
  onEditField: (field: TableField) => void
}) {
  // Only while a cell is chosen: a bar that says "No cell chosen" is a row of the screen for nothing.
  if (!active) return null
  const field = table.fields.find((f) => f.id === active.columnId)
  const row = active.row
  const explain = field ? explainField(field, table, tables) : null
  const value = field && row ? cellText(field, row) : ''
  const editable = field !== undefined && canDesign && (field.type === 'FORMULA' || field.type === 'LOOKUP' || field.type === 'ROLLUP' || field.type === 'LINK' || field.type === 'CHOICE' || field.type === 'AUTO')

  return (
    <div className="hidden min-h-[36px] items-stretch border-b border-paper-edge bg-[#f9fbfd] text-[14px] md:flex" aria-label="Formula bar">
      <div className="flex w-[190px] flex-none items-center border-r border-paper-line px-3 font-semibold text-ink">
        <span className="truncate">{field ? nameBoxText(field.name, row ? row.number : null) : ''}</span>
      </div>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 px-3 py-1.5">
        {field && explain?.kind === 'formula' && (
          <>
            <span className="font-serif text-[15px] text-stamp italic" aria-hidden>
              ƒ
            </span>
            <span className="flex flex-wrap items-center gap-1 font-mono text-[12.5px]">
              <span className="text-ink-soft">=</span>
              {explain.parts.map((part, i) =>
                part.kind === 'ref' ? (
                  <span key={i} className="rounded-[5px] bg-stamp-soft px-1.5 py-px font-semibold text-stamp">
                    {part.text}
                  </span>
                ) : (
                  <span key={i} className="whitespace-pre text-ink">
                    {part.text}
                  </span>
                ),
              )}
            </span>
            {value !== '' && <span className="tabular text-ink-soft">→ {value}</span>}
            <span className="rounded-full bg-paper px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">Same for every row</span>
          </>
        )}
        {field && explain?.kind === 'note' && (
          <>
            <span className="text-ink-soft">{explain.text}</span>
            {value !== '' && <span className="tabular font-semibold text-ink">→ {value}</span>}
          </>
        )}
        {field && explain?.kind === 'plain' && <span className={`min-w-0 truncate ${value === '' ? 'text-ink-soft' : 'text-ink'}`}>{row ? value || 'Empty' : 'Type here to add a row.'}</span>}
        {editable && (
          <button type="button" onClick={() => field && onEditField(field)} className="ml-auto flex-none font-semibold text-stamp hover:underline">
            {field?.type === 'FORMULA' ? 'Edit the column formula' : 'Edit this column'}
          </button>
        )}
      </div>
    </div>
  )
}
