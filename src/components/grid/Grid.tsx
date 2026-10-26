import { memo, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { columnLetter, fillerRowCount } from '../../lib/grid-letters'
import { formatDateCell, formatMoneyCell, parseDateInput, parseMoneyInput } from '../../lib/grid-parse'
import { downloadFile } from '../../lib/download'
import { exportFileName, toCsv, toXlsx, type ExportCell } from '../../lib/export-table'
import { searchRows, sortRows, sumMoney, type SortDir } from '../../lib/grid-rows'
import { useGridPrefs } from '../../lib/use-grid-prefs'
import { useToast } from '../../lib/toast-context'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { Popover } from '../Popover'
import { PromptDialog } from '../PromptDialog'
import { useWorkspaceChrome } from '../workspace/workspace-chrome'
import { IconLink, IconLock, IconSearch, IconTrash } from '../icons'
import { ChoiceCell, ReadCell, TextCell, TickCell } from './GridCells'
import { NEW_CHOICE, type GridColumn, type GridProps, type RowLock } from './grid-types'

const ROW_LIMIT_STEP = 300
const isRightAligned = (column: { type: string }) => column.type === 'money' || column.type === 'number' || column.type === 'calc'

function normalizer(type: string): ((typed: string) => string) | undefined {
  if (type === 'money') {
    return (typed) => {
      const parsed = parseMoneyInput(typed)
      return parsed.kind === 'ok' ? formatMoneyCell(parsed.value) : ''
    }
  }
  if (type === 'date') return (typed) => formatDateCell(parseDateInput(typed))
  return (typed) => typed.trim()
}

// What a cell becomes in an exported file: numbers stay numbers, the rest is its text.
function exportCell<R>(column: GridColumn<R>, row: R): ExportCell {
  if (column.type === 'money' || column.type === 'number' || column.type === 'calc') {
    const value = column.value(row)
    return typeof value === 'number' ? value : null
  }
  if (column.type === 'tick') return column.value(row) === true ? 'Yes' : ''
  return cellText(column, row)
}

function cellText<R>(column: GridColumn<R>, row: R): string {
  if (column.text) return column.text(row)
  const value = column.value(row)
  return value === null || value === undefined || typeof value === 'boolean' ? '' : String(value)
}

interface BadCell {
  rowId: string
  columnId: string
  message: string
}

interface RowHandlers<R> {
  commit: (row: R, columnId: string, text: string) => Promise<string | null | undefined | void>
  pick: (rowId: string, checked: boolean) => void
  remove?: (row: R) => void
  fxOpen?: GridProps<R>['fx']
  paste?: (text: string) => void
}

function FxButton({ active, onClick }: { active: boolean; onClick: (anchor: DOMRect) => void }) {
  return (
    <button
      type="button"
      aria-label="Amount type"
      title="Amount type"
      onClick={(event) => onClick(event.currentTarget.getBoundingClientRect())}
      className={`absolute top-1/2 left-1.5 z-[1] h-[22px] w-[22px] -translate-y-1/2 rounded-md border border-stamp/40 bg-stamp-soft p-0 font-serif text-[13px] leading-none font-bold text-stamp italic focus-visible:opacity-100 group-focus-within:opacity-100 group-hover:opacity-100 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      ƒ
    </button>
  )
}

function CalcChip({ children }: { children: ReactNode }) {
  return (
    <span className="pointer-events-none absolute right-2 bottom-px rounded-full bg-stamp-soft px-[7px] text-[10.5px] text-stamp">
      {children}
    </span>
  )
}

function pillClass(tone: 'in' | 'out' | 'muted' | undefined): string {
  if (tone === 'in') return 'bg-green-soft text-green'
  if (tone === 'out') return 'bg-rust-soft text-rust'
  return 'bg-paper-edge text-ink-soft'
}

function BodyRowImpl<R>({
  row,
  id,
  index,
  columns,
  picked,
  lock,
  lockChipColumn,
  bad,
  handlers,
}: {
  row: R
  id: string
  index: number
  columns: GridColumn<R>[]
  picked: boolean
  lock: RowLock | null
  lockChipColumn?: string
  bad: BadCell | null
  handlers: RowHandlers<R>
}) {
  const { commit, pick, remove, fxOpen, paste } = handlers
  return (
    <div
      role="row"
      className={`group/row relative grid grid-cols-[var(--cols)] border-b border-paper-edge ${lock ? 'bg-[var(--color-brass-row)]' : picked ? 'bg-[var(--color-sel)]' : 'bg-white'}`}
    >
      <div className="relative flex items-center justify-center border-r border-paper-edge bg-[#f8fafc] text-[11.5px] text-ink-soft">
        {lock ? (
          <span className="text-brass" title={`Posted from ${lock.label} — change it there`}>
            <IconLock width={14} height={14} />
          </span>
        ) : (
          <>
            <span className={picked ? 'opacity-0' : 'group-focus-within/row:opacity-0 group-hover/row:opacity-0'}>{index + 1}</span>
            <input
              type="checkbox"
              checked={picked}
              aria-label="Select row"
              className={`absolute h-4 w-4 accent-stamp focus-visible:opacity-100 group-hover/row:opacity-100 ${picked ? 'opacity-100' : 'opacity-0'}`}
              onChange={(event) => pick(id, event.target.checked)}
            />
          </>
        )}
      </div>

      {columns.map((column) => {
        const isBad = bad?.columnId === column.id
        const message = isBad ? bad?.message : undefined
        const text = cellText(column, row)
        const address = { column: column.id, row: index }
        const disabled = Boolean(lock) || column.readOnly?.(row) === true
        let content: ReactNode

        if (lock && column.id === lockChipColumn) {
          content = (
            <div className="flex min-w-0 items-center gap-2 px-3 py-2.5 text-[13.5px]">
              <span className="truncate">{text}</span>
              <button
                type="button"
                onClick={lock.onOpen}
                title={`Open ${lock.label}`}
                className="inline-flex flex-none items-center gap-1 rounded-full bg-brass-soft px-2 py-px text-[11px] font-bold tracking-wide text-brass"
              >
                <IconLink width={11} height={11} /> {lock.label}
              </button>
            </div>
          )
        } else if (column.locked || column.type === 'calc') {
          content = (
            <ReadCell align={isRightAligned(column) ? 'right' : undefined}>
              {column.onActivate ? (
                <button type="button" onClick={() => column.onActivate?.(row)} className="font-semibold text-stamp underline-offset-2 hover:underline">
                  {text}
                </button>
              ) : (
                text
              )}
            </ReadCell>
          )
        } else if (column.type === 'pill') {
          content = (
            <ReadCell>
              <span className={`inline-block rounded-full px-2.5 py-px text-xs font-semibold ${pillClass(column.pillTone?.(row))}`}>{text}</span>
            </ReadCell>
          )
        } else if (column.type === 'choice' || column.type === 'person') {
          const value = String(column.value(row) ?? '')
          content = (
            <ChoiceCell
              address={address}
              value={value}
              choices={column.choices?.(row) ?? []}
              newChoice={column.newChoice}
              placeholder={column.placeholder ?? (column.required ? undefined : '')}
              disabled={disabled}
              ariaLabel={column.label}
              bad={isBad}
              message={message}
              emphasis={column.choiceClass?.(value)}
              onPick={(next) => commit(row, column.id, next)}
            />
          )
        } else if (column.type === 'tick') {
          content = (
            <TickCell
              value={column.value(row) === true}
              disabled={disabled}
              ariaLabel={column.label}
              onToggle={(next) => commit(row, column.id, next ? 'true' : 'false')}
            />
          )
        } else {
          const calcChip = column.fx && fxOpen ? fxOpen.chip(row, column.id) : null
          const href = column.href?.(row)
          content = (
            <TextCell
              address={address}
              display={text}
              align={isRightAligned(column) ? 'right' : undefined}
              tone={column.tone}
              disabled={disabled}
              ariaLabel={column.label}
              bad={isBad}
              message={message}
              normalize={normalizer(column.type)}
              onCommit={(typed) => commit(row, column.id, typed)}
              onPasteText={paste}
              extraClass={`${column.fx ? 'pl-9' : ''} ${calcChip ? 'pb-4 pt-1.5' : ''} ${href ? 'pr-8' : ''}`}
              before={
                column.fx && fxOpen && !lock ? (
                  <FxButton
                    active={Boolean(calcChip)}
                    onClick={(anchor) => fxOpen.open({ row, columnId: column.id, anchor })}
                  />
                ) : undefined
              }
              after={
                <>
                  {calcChip && <CalcChip>ƒ {calcChip}</CalcChip>}
                  {href && (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open the link"
                      aria-label="Open the link"
                      className="absolute top-1/2 right-1.5 flex h-[22px] w-[22px] -translate-y-1/2 items-center justify-center rounded-md bg-white font-bold text-stamp hover:bg-stamp-soft"
                    >
                      ↗
                    </a>
                  )}
                </>
              }
            />
          )
        }
        return (
          <div key={column.id} role="cell" className="relative flex min-w-0 items-center border-r border-paper-edge">
            {content}
          </div>
        )
      })}

      <div className="flex items-center justify-center">
        {!lock && remove && (
          <button
            type="button"
            aria-label="Delete row"
            title="Delete row"
            onClick={() => remove(row)}
            className="h-7 w-7 rounded-md text-ink-soft/60 opacity-0 hover:bg-rust-soft hover:text-rust focus-visible:opacity-100 group-hover/row:opacity-100"
          >
            <IconTrash width={15} height={15} className="mx-auto" />
          </button>
        )}
      </div>
    </div>
  )
}

const BodyRow = memo(BodyRowImpl) as typeof BodyRowImpl

type SortState = { columnId: string; dir: SortDir } | null

export function Grid<R>(props: GridProps<R>) {
  const {
    prefsKey,
    columns,
    rows,
    rowId,
    rowLock,
    lockChipColumn,
    onCommit,
    addRow,
    fx,
    onDeleteRows,
    bulkActions,
    filter,
    leadRow,
    onPasteText,
    toolbarLeft,
    toolbarEnd,
    summary,
    filterPanel,
    filterCount,
    viewMenuItems,
    dataMenuItems,
    minRows,
    emptyTitle,
    emptyHint,
    noun,
    hiddenIds,
    exportName,
    headerEnd,
    onRenameColumn,
    footRows,
    footEnd,
  } = props
  const toast = useToast()
  const chrome = useWorkspaceChrome()
  const root = useRef<HTMLDivElement>(null)
  const { prefs, rename, hide, show } = useGridPrefs(prefsKey)

  const [sort, setSort] = useState<SortState>(null)
  const [query, setQuery] = useState('')
  const [filterValue, setFilterValue] = useState('')
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [limit, setLimit] = useState(ROW_LIMIT_STEP)
  const [bad, setBad] = useState<BadCell | null>(null)
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)
  const [renaming, setRenaming] = useState<GridColumn<R> | null>(null)
  const [filterAnchor, setFilterAnchor] = useState<DOMRect | null>(null)

  // The viewer's own column names; the columns they hid are left out.
  const labelled = useMemo(
    () => columns.map((column) => ({ ...column, label: prefs.labels[column.id] ?? column.label })),
    [columns, prefs.labels],
  )
  const visible = useMemo(() => labelled.filter((column) => !prefs.hidden.includes(column.id)), [labelled, prefs.hidden])

  // Latest callbacks, so the memoised rows do not redraw on every keystroke elsewhere.
  const latest = useRef({ onCommit, onDeleteRows, fx, onPasteText, rowId })
  useEffect(() => {
    latest.current = { onCommit, onDeleteRows, fx, onPasteText, rowId }
  })
  const hasFx = fx !== undefined
  const hasPaste = onPasteText !== undefined

  const handlers = useMemo<RowHandlers<R>>(
    () => ({
      commit: async (row, columnId, text) => {
        const problem = await latest.current.onCommit(row, columnId, text)
        if (problem) {
          toast(problem)
          setBad({ rowId: latest.current.rowId(row), columnId, message: problem })
        } else {
          setBad(null)
        }
        return problem
      },
      pick: (id, checked) =>
        setPicked((current) => {
          const next = new Set(current)
          if (checked) next.add(id)
          else next.delete(id)
          return next
        }),
      remove: (row) => latest.current.onDeleteRows?.([row]),
      fxOpen: hasFx
        ? {
            chip: (row, columnId) => latest.current.fx?.chip(row, columnId),
            open: (target) => latest.current.fx?.open(target),
          }
        : undefined,
      paste: hasPaste ? (text) => latest.current.onPasteText?.(text) : undefined,
    }),
    [hasFx, hasPaste, toast],
  )

  const list = useMemo(() => {
    let result = hiddenIds && hiddenIds.size > 0 ? rows.filter((row) => !hiddenIds.has(rowId(row))) : rows
    if (filter && filterValue !== '') result = result.filter((row) => filter.match(row, filterValue))
    result = searchRows(result, query, (row) => visible.map((column) => cellText(column, row)).join(' '))
    if (sort) {
      const column = labelled.find((candidate) => candidate.id === sort.columnId)
      if (column) result = sortRows(result, column.value, sort.dir)
    }
    return result
  }, [rows, hiddenIds, filter, filterValue, query, visible, labelled, sort, rowId])

  const shown = list.slice(0, limit)
  const lead = leadRow?.(list, sort !== null) ?? null
  const selectable = list.filter((row) => !rowLock?.(row))
  const pickedRows = selectable.filter((row) => picked.has(rowId(row)))
  const allPicked = selectable.length > 0 && pickedRows.length === selectable.length
  const isFiltered = query.trim() !== '' || filterValue !== ''
  const gridTemplate = `40px ${visible.map((column) => column.width).join(' ')} 44px`
  const hiddenColumns = labelled.filter((column) => prefs.hidden.includes(column.id))

  function openHeaderMenu(column: GridColumn<R>, anchor: DOMRect) {
    const items: MenuEntry[] = []
    if (column.locked || column.type === 'calc') {
      items.push({ label: 'Worked out for you', hint: "You can't type in this column.", disabled: true })
    }
    items.push(
      { label: 'Sort A → Z', onSelect: () => setSort({ columnId: column.id, dir: 1 }) },
      { label: 'Sort Z → A', onSelect: () => setSort({ columnId: column.id, dir: -1 }) },
    )
    if (sort?.columnId === column.id) items.push({ label: 'Clear sort', onSelect: () => setSort(null) })
    if (column.menu?.length) {
      items.push('separator', ...column.menu.map((entry) => ({ label: entry.label, hint: entry.hint, onSelect: entry.onSelect })))
    }
    items.push(
      'separator',
      { label: 'Rename column', onSelect: () => (onRenameColumn ? onRenameColumn(column) : setRenaming({ ...column, label: column.label })) },
      {
        label: 'Hide column',
        hint: column.required ? 'Needed for the totals.' : undefined,
        disabled: column.required,
        onSelect: () => {
          hide(column.id)
          toast(`Hidden “${column.label}”. Columns → show it again.`)
        },
      },
    )
    setMenu({ anchor, items })
  }

  async function exportTo(kind: 'csv' | 'xlsx') {
    const headers = visible.map((column) => column.label)
    const body = list.map((row) => visible.map((column) => exportCell(column, row)))
    const name = exportName ?? 'table'
    try {
      if (kind === 'csv') {
        downloadFile(toCsv(headers, body), exportFileName(name, 'csv'), 'text/csv;charset=utf-8')
      } else {
        // The library is only fetched when somebody asks for a workbook.
        const XLSX = await import('xlsx')
        downloadFile(toXlsx(XLSX, name, headers, body).slice().buffer, exportFileName(name, 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      }
      toast(`${list.length} ${list.length === 1 ? noun : noun === 'entry' ? 'entries' : `${noun}s`} saved.`)
    } catch {
      toast('Could not save the file.')
    }
  }

  function togglePickAll(checked: boolean) {
    setPicked(checked ? new Set(selectable.map(rowId)) : new Set())
  }

  const sumColumns = visible.filter((column) => column.sum)
  const draft = addRow
  const draftIndex = shown.length
  const fillers = minRows ? fillerRowCount(minRows, shown.length, Boolean(draft)) : 0
  // A sheet with a minimum of rows shows its empty rows instead of a message (unless a search found nothing).
  const showEmptyMessage = list.length === 0 && (isFiltered || !minRows)
  const letterOf = (columnId: string) => columnLetter(labelled.findIndex((column) => column.id === columnId))
  const filterBadge = (filterValue !== '' ? 1 : 0) + (filterCount ?? 0)
  const hasFilterPanel = Boolean(filter) || Boolean(filterPanel)

  function focusDraft(columnId: string) {
    root.current?.querySelector<HTMLElement>(`[data-grid-cell][data-draft][data-col="${CSS.escape(columnId)}"]`)?.focus()
  }

  const toolButton = 'inline-flex items-center gap-1.5 rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold text-ink hover:bg-stamp-soft'

  const viewItems: MenuEntry[] = [
    ...hiddenColumns.map((column) => ({ label: `Show “${column.label}”`, onSelect: () => show(column.id) }) as MenuEntry),
    ...(hiddenColumns.length > 1 ? [{ label: 'Show all columns', onSelect: () => show('all') } as MenuEntry] : []),
    ...(hiddenColumns.length === 0 ? [{ label: 'No hidden columns', hint: 'Hide one from its column menu.', disabled: true } as MenuEntry] : []),
    ...(viewMenuItems && viewMenuItems.length > 0 ? (['separator', ...viewMenuItems] as MenuEntry[]) : []),
  ]
  const exportItems: MenuEntry[] = exportName
    ? [
        { label: 'Export to Excel (.xlsx)', hint: 'Values only, the columns you see.', onSelect: () => void exportTo('xlsx') },
        { label: 'Export to CSV (.csv)', hint: 'Opens in any spreadsheet.', onSelect: () => void exportTo('csv') },
      ]
    : []
  const dataItems: MenuEntry[] = [...(dataMenuItems ?? []), ...(dataMenuItems && dataMenuItems.length > 0 && exportItems.length > 0 ? (['separator'] as MenuEntry[]) : []), ...exportItems]

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2 border-b border-paper-line bg-white px-4 py-2">
      <label className="relative block">
        <IconSearch width={15} height={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-soft" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search"
          aria-label="Search"
          className="w-48 rounded-ledger border border-paper-line bg-white py-1.5 pr-2.5 pl-8 text-[13px] focus:border-stamp focus:outline-none"
        />
      </label>
      {hasFilterPanel && (
        <button type="button" aria-haspopup="dialog" onClick={(event) => setFilterAnchor(event.currentTarget.getBoundingClientRect())} className={toolButton}>
          Filter
          {filterBadge > 0 && <span className="rounded-full bg-stamp px-1.5 text-[11px] leading-[18px] text-white">{filterBadge}</span>}
          <span className="text-[10px] opacity-50">▾</span>
        </button>
      )}
      <button type="button" aria-haspopup="menu" onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: viewItems })} className={toolButton}>
        View{hiddenColumns.length > 0 ? ` (${hiddenColumns.length} hidden)` : ''}
        <span className="text-[10px] opacity-50">▾</span>
      </button>
      {toolbarLeft}
      <div className="flex-1" />
      {summary}
      {dataItems.length > 0 && (
        <button type="button" aria-haspopup="menu" onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: dataItems })} className={toolButton}>
          Data
          <span className="text-[10px] opacity-50">▾</span>
        </button>
      )}
      {toolbarEnd}
    </div>
  )

  const bulkBar =
    pickedRows.length > 0 ? (
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 bg-ink px-4 py-2.5 text-[13.5px] text-white">
        <span>
          <b>{pickedRows.length}</b> selected
        </span>
        {sumColumns.slice(0, 2).map((column) => (
          <span key={column.id}>
            {column.label} <b className="tabular">{formatMoneyCell(sumMoney(pickedRows.map((row) => Number(column.value(row)))))}</b>
          </span>
        ))}
        {bulkActions?.map((action) => (
          <select
            key={action.id}
            value=""
            aria-label={action.label}
            className="rounded-ledger border-0 bg-white px-2 py-1 text-[13px] text-ink"
            onChange={async (event) => {
              const value = event.target.value
              if (value === '') return
              await action.run(pickedRows, value)
              setPicked(new Set())
            }}
          >
            <option value="">{action.label}</option>
            {action.choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        ))}
        {onDeleteRows && (
          <button
            type="button"
            className="font-semibold text-stamp-soft underline"
            onClick={() => {
              onDeleteRows(pickedRows)
              setPicked(new Set())
            }}
          >
            Delete
          </button>
        )}
        <button type="button" className="text-stamp-soft underline" onClick={() => setPicked(new Set())}>
          Clear
        </button>
      </div>
    ) : null

  const head = (
    <>
      {toolbar}
      {bulkBar}
    </>
  )

  return (
    <div ref={root} data-grid-root className="bg-white">
      {chrome.toolbarHost ? createPortal(head, chrome.toolbarHost) : head}

      <div role="table" aria-label={`${noun}s`}>
        <div className="min-w-max" style={{ '--cols': gridTemplate } as CSSProperties}>
          {/* A, B, C … like a spreadsheet. They stay under the tabs and the toolbar while the rows scroll. */}
          <div
            role="presentation"
            aria-hidden
            className="sticky top-[var(--ws-top,0px)] z-[3] grid h-[22px] grid-cols-[var(--cols)] border-b border-paper-line bg-[#f8fafc] text-[11px] tracking-wider text-ink-soft"
          >
            <div className="border-r border-paper-edge" />
            {visible.map((column) => (
              <div key={column.id} className="flex items-center justify-center border-r border-paper-edge">
                {letterOf(column.id)}
              </div>
            ))}
            <div />
          </div>
          <div
            role="row"
            className="sticky top-[calc(var(--ws-top,0px)+22px)] z-[3] grid grid-cols-[var(--cols)] border-b-2 border-paper-line bg-[#f8fafc]"
          >
            <div className="flex items-center justify-center border-r border-paper-edge">
              <input
                type="checkbox"
                checked={allPicked}
                aria-label="Select all rows"
                className="h-4 w-4 accent-stamp"
                onChange={(event) => togglePickAll(event.target.checked)}
              />
            </div>
            {visible.map((column) => (
              <div key={column.id} role="columnheader" className="flex min-w-0 border-r border-paper-edge">
                <button
                  type="button"
                  aria-haspopup="menu"
                  onClick={(event) => openHeaderMenu(column, event.currentTarget.getBoundingClientRect())}
                  className={`group/head flex w-full items-center gap-1.5 px-3 py-1.5 text-left text-[13px] font-semibold text-ink hover:bg-stamp/[0.06] hover:text-stamp ${isRightAligned(column) ? 'justify-end' : ''}`}
                >
                  {(column.locked || column.type === 'calc') && (
                    <span className="text-brass" title="Worked out for you">
                      <IconLock width={12} height={12} />
                    </span>
                  )}
                  <span className="truncate">{column.unnamed ? <span className="font-medium text-ink-soft/60">Name</span> : column.label}</span>
                  {sort?.columnId === column.id ? (
                    <span aria-label={sort.dir === 1 ? 'sorted ascending' : 'sorted descending'}>{sort.dir === 1 ? '↑' : '↓'}</span>
                  ) : (
                    <span className="text-[10px] opacity-0 group-hover/head:opacity-60 group-focus-visible/head:opacity-60">▾</span>
                  )}
                </button>
              </div>
            ))}
            <div className="flex items-center justify-center">{headerEnd}</div>
          </div>

          {lead && (
            <div role="row" className="grid grid-cols-[var(--cols)] border-b border-paper-edge bg-[#f8fafc] text-[13px] text-ink-soft italic">
              <div />
              {visible.map((column) => (
                <div key={column.id} className={`px-3 py-2.5 ${isRightAligned(column) ? 'tabular text-right' : ''}`}>
                  {lead[column.id] ?? ''}
                </div>
              ))}
              <div />
            </div>
          )}

          {showEmptyMessage && (
            <div className="border-b border-paper-edge px-5 py-8 text-center text-sm text-ink-soft">
              {!isFiltered ? (
                <>
                  <b className="mb-1 block text-base text-ink">{emptyTitle}</b>
                  {emptyHint}
                </>
              ) : (
                <>
                  <b className="mb-1 block text-base text-ink">Nothing matches</b>
                  Clear the search or filter.
                </>
              )}
            </div>
          )}

          {shown.map((row, index) => {
            const id = rowId(row)
            return (
              <BodyRow
                key={id}
                row={row}
                id={id}
                index={index}
                columns={visible}
                picked={picked.has(id)}
                lock={rowLock?.(row) ?? null}
                lockChipColumn={lockChipColumn}
                bad={bad?.rowId === id ? bad : null}
                handlers={handlers}
              />
            )
          })}

          {list.length > shown.length && (
            <div className="border-b border-paper-edge px-4 py-2.5 text-center text-[13px]">
              Showing {shown.length} of {list.length}.{' '}
              <button type="button" className="font-semibold text-stamp underline" onClick={() => setLimit(limit + ROW_LIMIT_STEP)}>
                Show {Math.min(ROW_LIMIT_STEP, list.length - shown.length)} more
              </button>
            </div>
          )}

          {draft && (
            <div role="row" className="grid grid-cols-[var(--cols)] border-b border-paper-edge bg-white">
              <div className="flex items-center justify-center border-r border-paper-edge bg-[#f8fafc] text-[11.5px] text-ink-soft">{draftIndex + 1}</div>
              {visible.map((column) => {
                const address = { column: column.id, row: draftIndex, draft: true }
                const isBad = draft.badColumn === column.id
                const disabledHere = draft.disabledColumns?.includes(column.id) === true
                const value = draft.values[column.id] ?? ''
                let content: ReactNode
                if (column.locked || column.type === 'calc' || column.type === 'pill') {
                  content = <ReadCell muted>{column.draftNote ?? ''}</ReadCell>
                } else if (column.type === 'choice' || column.type === 'person') {
                  content = (
                    <ChoiceCell
                      address={address}
                      value={value}
                      choices={column.choices?.(null) ?? []}
                      newChoice={column.newChoice}
                      placeholder={column.placeholder ?? 'Choose…'}
                      ariaLabel={`New ${noun}: ${column.label}`}
                      bad={isBad}
                      onPick={(next) => {
                        // "＋ New …" is a request to the table, not a value for the row.
                        if (next === NEW_CHOICE) draft.onNewChoice?.(column.id)
                        else draft.onChange(column.id, next)
                      }}
                    />
                  )
                } else if (column.type === 'tick') {
                  content = (
                    <TickCell
                      value={value === 'true'}
                      ariaLabel={`New ${noun}: ${column.label}`}
                      onToggle={(next) => draft.onChange(column.id, next ? 'true' : 'false')}
                    />
                  )
                } else {
                  const calcChip = column.fx && fx ? fx.chip(null, column.id) : null
                  content = (
                    <TextCell
                      address={address}
                      display={value}
                      align={isRightAligned(column) ? 'right' : undefined}
                      tone={column.tone}
                      disabled={disabledHere}
                      ariaLabel={`New ${noun}: ${column.label}`}
                      placeholder={column.id === draft.focusColumn ? `Add ${noun === 'entry' ? 'an' : 'a'} ${noun}…` : column.placeholder}
                      bad={isBad}
                      onDraftChange={(text) => draft.onChange(column.id, text)}
                      onDraftSubmit={draft.onSubmit}
                      onPasteText={onPasteText}
                      extraClass={`${column.fx ? 'pl-9' : ''} ${calcChip ? 'pb-4 pt-1.5' : ''}`}
                      before={
                        column.fx && fx ? (
                          <FxButton
                            active={Boolean(calcChip)}
                            onClick={(anchor) => fx.open({ row: null, columnId: column.id, anchor })}
                          />
                        ) : undefined
                      }
                      after={calcChip ? <CalcChip>ƒ {calcChip}</CalcChip> : undefined}
                    />
                  )
                }
                return (
                  <div key={column.id} className="relative flex min-w-0 items-center border-r border-paper-edge">
                    {content}
                  </div>
                )
              })}
              <div className="flex items-center justify-center">
                <button
                  type="button"
                  aria-label={`Add this ${noun}`}
                  title="Add (Enter)"
                  disabled={draft.isSubmitting}
                  onClick={draft.onSubmit}
                  className="h-7 w-7 rounded-ledger bg-stamp font-bold text-white disabled:opacity-50"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Empty rows, only so that the sheet looks like a sheet. A click goes to the add-row. */}
          {Array.from({ length: fillers }, (_, i) => (
            <div key={`filler-${i}`} aria-hidden className="grid h-[38px] grid-cols-[var(--cols)] border-b border-paper-edge bg-white">
              <div className="flex items-center justify-center border-r border-paper-edge bg-[#f8fafc] text-[11.5px] text-ink-soft/70">
                {shown.length + (draft ? 2 : 1) + i}
              </div>
              {visible.map((column) => (
                <div
                  key={column.id}
                  className="border-r border-paper-edge"
                  onMouseDown={
                    draft
                      ? (event) => {
                          event.preventDefault()
                          focusDraft(column.id)
                        }
                      : undefined
                  }
                />
              ))}
              <div />
            </div>
          ))}

          {footRows ? (
            <div className="sticky bottom-0 z-[2] border-t-2 border-paper-line bg-[#f8fafc] text-[13.5px]">
              {footRows.map((fr) => (
                <div key={fr.id} role="row" className="grid grid-cols-[var(--cols)] border-b border-paper-edge font-semibold last:border-b-0">
                  <div aria-hidden className="flex items-center justify-center text-[16px] text-stamp">
                    Σ
                  </div>
                  {visible.map((column, index) => {
                    const cell = fr.cells[column.id]
                    const right = isRightAligned(column)
                    return (
                      <div key={column.id} className={`relative flex min-w-0 items-center border-r border-paper-edge/60 ${right ? 'justify-end' : ''}`}>
                        {index === 0 ? (
                          <span className="block px-3 py-2">
                            <span className="mr-2 text-xs tracking-wider text-ink-soft uppercase">{fr.label}</span>
                            {cell?.text}
                          </span>
                        ) : cell?.onClick ? (
                          <button
                            type="button"
                            onClick={cell.onClick}
                            title="Choose what this cell shows"
                            className={`m-1 inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-1 text-[13px] hover:border-stamp hover:text-stamp ${
                              cell.text === '' ? 'border-dashed border-paper-line bg-white text-ink-soft' : 'border-paper-line bg-white'
                            } ${cell.error ? 'text-xs font-medium text-rust' : ''}`}
                          >
                            {cell.text === '' ? (
                              <span className="font-semibold">{right ? 'Add' : 'Σ'}</span>
                            ) : (
                              <>
                                {cell.label && <span className="text-[11.5px] font-semibold text-ink-soft">{cell.label}</span>}
                                <span className="tabular truncate">{cell.text}</span>
                              </>
                            )}
                            <span className="text-[10px] opacity-50">▾</span>
                          </button>
                        ) : (
                          <span className="tabular block px-3 py-2">{cell?.text}</span>
                        )}
                      </div>
                    )
                  })}
                  <div />
                </div>
              ))}
              {footEnd && <div className="sticky left-0 flex w-max max-w-[100vw] items-center gap-5 border-t border-paper-edge px-3 py-1.5 text-[12.5px] font-normal text-ink-soft">{footEnd}</div>}
            </div>
          ) : (
            <div role="row" className="sticky bottom-0 z-[2] grid grid-cols-[var(--cols)] border-t-2 border-paper-line bg-[#f8fafc] text-[13.5px] font-bold">
              <div aria-hidden className="flex items-center justify-center text-[16px] text-stamp">
                Σ
              </div>
              {visible.map((column, index) => {
                let text = ''
                if (column.footer) text = column.footer(list)
                else if (column.sum) text = formatMoneyCell(sumMoney(list.map((row) => Number(column.value(row)))))
                else if (index === 0) text = `${list.length} ${list.length === 1 ? noun : noun === 'entry' ? 'entries' : `${noun}s`}`
                const right = Boolean(column.footer) || Boolean(column.sum)
                return (
                  <div
                    key={column.id}
                    className={`px-3 py-2.5 whitespace-nowrap ${right ? 'tabular text-right' : 'font-semibold text-ink-soft'} ${column.tone === 'in' ? 'text-green' : column.tone === 'out' ? 'text-rust' : ''}`}
                  >
                    {text}
                  </div>
                )
              })}
              <div />
            </div>
          )}
        </div>
      </div>

      {filterAnchor && (
        <Popover anchor={filterAnchor} title="Filter" onClose={() => setFilterAnchor(null)}>
          <div className="flex flex-col gap-3 text-[13px]">
            {filter && (
              <label className="block">
                <span className="mb-1 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">{filter.label.replace(/^All /, '')}</span>
                <select
                  value={filterValue}
                  onChange={(event) => setFilterValue(event.target.value)}
                  aria-label="Filter"
                  className="w-full rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[13px]"
                >
                  <option value="">{filter.label}</option>
                  {filter.choices.map((choice) => (
                    <option key={choice.value} value={choice.value}>
                      {choice.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {filterPanel?.(() => setFilterAnchor(null))}
            {filterValue !== '' && (
              <button type="button" className="self-start text-[12.5px] font-semibold text-stamp underline" onClick={() => setFilterValue('')}>
                Clear this filter
              </button>
            )}
          </div>
        </Popover>
      )}

      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}

      {renaming && (
        <PromptDialog
          title="Rename column"
          label="Column name"
          initial={renaming.label}
          validate={(value) =>
            value !== '' && labelled.some((column) => column.id !== renaming.id && column.label.toLowerCase() === value.toLowerCase())
              ? 'Another column already has this name.'
              : null
          }
          onSubmit={(value) => {
            const original = columns.find((column) => column.id === renaming.id)?.label ?? renaming.label
            rename(renaming.id, value, original)
            toast(value === '' || value === original ? `Back to “${original}”.` : `Renamed to “${value}”.`)
          }}
          onClose={() => setRenaming(null)}
        />
      )}
    </div>
  )
}
