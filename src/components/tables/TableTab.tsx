import { useCallback, useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { ApiError, api } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'
import { formatMoneyCell } from '../../lib/grid-parse'
import { gridPrefsKey } from '../../lib/grid-prefs'
import { buildDraftValues, cellText, columnWidth, isDerived, planCellEdit } from '../../lib/table-grid'
import {
  useCreateRow,
  useDeleteField,
  useDeleteRow,
  useDeleteView,
  useRestoreField,
  useSaveView,
  useTableRows,
  useTableSummary,
  useUpdateField,
  useUpdateRow,
  useUpdateTable,
} from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import { useDeferredDelete } from '../../lib/use-deferred-delete'
import type { EngineRow, EngineRows, EngineTable, FnRow, FnSpec, TableField, ViewFilter } from '../../types/engine'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { Grid } from '../grid/Grid'
import type { FootRow, GridColumn } from '../grid/grid-types'
import { PromptDialog } from '../PromptDialog'
import { PostsButton } from '../workspace/PostsButton'
import { ColumnDialog } from './ColumnDialog'
import { filterSentence } from '../../lib/table-filters'
import { FilterDialog } from './FilterDialog'
import { FnDialog } from './FnDialog'

const EMPTY_ROWS: EngineRow[] = []
const rowId = (row: EngineRow) => row.id
const describeDeleted = (count: number) => (count === 1 ? 'Row deleted.' : `${count} rows deleted.`)
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

function gridType(field: TableField): GridColumn<EngineRow>['type'] {
  switch (field.type) {
    case 'NUMBER':
      return 'number'
    case 'MONEY':
      return 'money'
    case 'DATE':
      return 'date'
    case 'CHOICE':
    case 'LINK':
      return 'choice'
    case 'TICK':
      return 'tick'
    case 'TEXT':
      return 'text'
    default:
      return 'calc'
  }
}

// The name a row goes by when another table links to it: its first text column.
function rowName(table: EngineTable, row: EngineRow): string {
  const f = table.fields.find((x) => x.type === 'TEXT') ?? table.fields[0]
  const v = f ? row.values[f.id] : null
  return typeof v === 'string' && v !== '' ? v : `Row ${row.number}`
}

// One of the user's own tables as a sheet: type in a cell, add a row at the bottom, add columns
// (also formulas, links and rollups) and function rows under the table.
export function TableTab({ businessId, table, tables, onRules }: { businessId: string; table: EngineTable; tables: EngineTable[]; onRules: () => void }) {
  const { user } = useAuth()
  const toast = useToast()
  const [viewId, setViewId] = useState<string>(table.views[0]?.id ?? '')
  const [filters, setFilters] = useState<ViewFilter[]>([])
  const view = table.views.find((v) => v.id === viewId) ?? table.views[0]
  const { data, isLoading, error } = useTableRows(businessId, table.id, { viewId: view?.id, filters })
  const rows = data?.rows ?? EMPTY_ROWS
  const { data: summary } = useTableSummary(businessId, table.id, table.fnRows.length > 0)

  const createRow = useCreateRow(businessId, table.id)
  const updateRow = useUpdateRow(businessId, table.id)
  const deleteRow = useDeleteRow(businessId, table.id)
  const updateField = useUpdateField(businessId, table.id)
  const deleteField = useDeleteField(businessId, table.id)
  const restoreField = useRestoreField(businessId, table.id)
  const updateTable = useUpdateTable(businessId)
  const saveView = useSaveView(businessId, table.id)
  const deleteView = useDeleteView(businessId, table.id)

  const [draft, setDraft] = useState<{ values: Record<string, string>; bad: string | null }>({ values: {}, bad: null })
  const [adding, setAdding] = useState(false)
  const [columnDialog, setColumnDialog] = useState<{ field?: TableField } | null>(null)
  const [renaming, setRenaming] = useState<TableField | null>(null)
  const [fnDialog, setFnDialog] = useState<{ row: FnRow; field: TableField } | null>(null)
  const [fnRenaming, setFnRenaming] = useState<FnRow | null>(null)
  const [filtering, setFiltering] = useState(false)
  const [savingView, setSavingView] = useState(false)
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)

  // The rows of every table this one links to, so a link column can offer them.
  const linkFields = useMemo(() => table.fields.filter((f) => f.type === 'LINK'), [table.fields])
  const targetIds = useMemo(() => [...new Set(linkFields.map((f) => String(f.config.targetTableId)))], [linkFields])
  const targetQueries = useQueries({
    queries: targetIds.map((id) => ({
      queryKey: ['table-rows', businessId, id, 'options'],
      queryFn: () => api.get<EngineRows>(`/businesses/${businessId}/tables/${id}/rows?limit=2000`),
    })),
  })
  const linkOptions = useMemo(() => {
    const out: Record<string, { value: string; label: string }[]> = {}
    linkFields.forEach((f) => {
      const idx = targetIds.indexOf(String(f.config.targetTableId))
      const target = tables.find((t) => t.id === f.config.targetTableId)
      const list = targetQueries[idx]?.data?.rows ?? []
      out[f.id] = target ? list.map((r) => ({ value: r.id, label: rowName(target, r) })) : []
    })
    return out
  }, [linkFields, targetIds, targetQueries, tables])

  const deleteRows = useCallback((list: EngineRow[]) => Promise.all(list.map((r) => deleteRow.mutateAsync(r.id))), [deleteRow])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  const updateAsync = updateRow.mutateAsync
  const commit = useCallback(
    async (row: EngineRow, columnId: string, text: string): Promise<string | null> => {
      const field = table.fields.find((f) => f.id === columnId)
      if (!field) return null
      const plan = planCellEdit(field, text)
      if (plan.kind === 'error') return plan.message
      try {
        await updateAsync({ id: row.id, values: { [field.id]: plan.value }, version: row.version })
        return null
      } catch (err) {
        return messageOf(err)
      }
    },
    [table.fields, updateAsync],
  )

  const changeDraft = useCallback((columnId: string, text: string) => {
    setDraft((current) => ({ values: { ...current.values, [columnId]: text }, bad: current.bad === columnId ? null : current.bad }))
  }, [])

  async function submitDraft() {
    if (adding) return
    const built = buildDraftValues(table.fields, draft.values)
    if (!built.ok) {
      toast(built.message)
      setDraft((current) => ({ ...current, bad: built.column }))
      return
    }
    setAdding(true)
    try {
      await createRow.mutateAsync(built.values)
      setDraft({ values: {}, bad: null })
      const first = table.fields.find((f) => !isDerived(f))
      if (first) window.setTimeout(() => document.querySelector<HTMLElement>(`[data-grid-cell][data-draft][data-col="${CSS.escape(first.id)}"]`)?.focus(), 0)
    } catch (err) {
      toast(messageOf(err))
    } finally {
      setAdding(false)
    }
  }

  async function removeColumn(field: TableField) {
    try {
      await deleteField.mutateAsync(field.id)
      toast(`Column “${field.name}” deleted.`, {
        undo: () => {
          void restoreField.mutateAsync(field.id).catch((err) => toast(messageOf(err)))
        },
      })
    } catch (err) {
      toast(messageOf(err))
    }
  }

  const columns = useMemo<GridColumn<EngineRow>[]>(
    () =>
      table.fields.map((f) => {
        const kind = gridType(f)
        const column: GridColumn<EngineRow> = {
          id: f.id,
          label: f.name,
          type: kind,
          width: columnWidth(f),
          locked: isDerived(f),
          value: (row) => {
            if (f.type === 'LINK') return row.cells[f.id]?.v ?? ''
            const worked = row.cells[f.id]
            if (worked) return worked.e ? worked.e : worked.v
            const v = row.values[f.id]
            return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null
          },
          text: (row) => cellText(f, row),
          menu: [
            ...(f.type === 'FORMULA' || f.type === 'CHOICE' || f.type === 'LINK' || f.type === 'LOOKUP' || f.type === 'ROLLUP' || f.type === 'AUTO'
              ? [{ label: f.type === 'FORMULA' ? 'Edit formula…' : 'Edit column…', onSelect: () => setColumnDialog({ field: f }) }]
              : []),
            { label: 'Delete column', hint: 'Formulas that use it will show an error.', onSelect: () => void removeColumn(f) },
          ],
        }
        if (f.type === 'CHOICE') {
          column.choices = () => ((f.config.options as string[] | undefined) ?? []).map((o) => ({ value: o, label: o }))
          column.placeholder = ''
        }
        if (f.type === 'LINK') {
          column.choices = () => linkOptions[f.id] ?? []
          column.placeholder = ''
          column.value = (row) => String((row.values[f.id] as string[] | undefined)?.[0] ?? '')
          column.text = (row) => cellText(f, row)
        }
        return column
      }),
    // removeColumn closes over mutation hooks that are stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [table.fields, linkOptions],
  )

  const footRows = useMemo<FootRow[]>(
    () =>
      table.fnRows.map((fr, i) => {
        const result = summary?.rows[i]
        const cells: FootRow['cells'] = {}
        for (const f of table.fields) {
          const spec = fr.cells[f.id]
          const r = result?.id === fr.id ? result.cells[f.id] : undefined
          const text = !spec ? '' : r?.e ? r.e : r === undefined ? '…' : typeof r.v === 'number' ? formatMoneyCell(r.v) : String(r.v ?? '')
          cells[f.id] = { text, error: Boolean(r?.e), onClick: () => setFnDialog({ row: fr, field: f }) }
        }
        return { id: fr.id, label: fr.label, cells }
      }),
    [table.fields, table.fnRows, summary],
  )

  async function saveFnRows(next: FnRow[]) {
    try {
      await updateTable.mutateAsync({ id: table.id, fnRows: next })
    } catch (err) {
      toast(messageOf(err))
    }
  }

  function addFnRow() {
    const used = new Set(table.fnRows.map((r) => r.label))
    let label = 'Total'
    for (let i = 2; used.has(label); i++) label = `Row ${i}`
    const money = table.fields.filter((f) => ['MONEY', 'NUMBER', 'FORMULA', 'ROLLUP'].includes(f.type))
    const cells: Record<string, FnSpec> = {}
    for (const f of money.slice(0, 6)) cells[f.id] = { fn: 'sum' }
    void saveFnRows([...table.fnRows, { id: `fn${Date.now().toString(36)}`, label, cells }])
  }

  function openViewMenu(anchor: DOMRect) {
    const items: MenuEntry[] = table.views.map((v) => ({
      label: `${v.id === view?.id ? '✓ ' : ''}${v.name}`,
      onSelect: () => {
        setViewId(v.id)
        setFilters([])
      },
    }))
    items.push('separator', { label: 'Save these filters as a view…', disabled: filters.length === 0, onSelect: () => setSavingView(true) })
    if (view && table.views.length > 1) {
      items.push({
        label: `Delete view “${view.name}”`,
        onSelect: () => {
          void deleteView.mutateAsync(view.id).then(() => setViewId(table.views.find((v) => v.id !== view.id)?.id ?? ''))
        },
      })
    }
    setMenu({ anchor, items })
  }

  const viewFilters = view?.config.filters ?? []

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load this table.
        </p>
      ) : isLoading ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Grid<EngineRow>
              prefsKey={gridPrefsKey(user?.id ?? 'anonymous', businessId, `table-${table.id}`)}
              columns={columns}
              rows={rows}
              rowId={rowId}
              onCommit={commit}
              addRow={{
                values: draft.values,
                onChange: changeDraft,
                onSubmit: () => void submitDraft(),
                badColumn: draft.bad,
                focusColumn: table.fields.find((f) => !isDerived(f))?.id ?? '',
                noun: 'row',
                isSubmitting: adding,
              }}
              onDeleteRows={schedule}
              hiddenIds={hiddenIds}
              exportName={table.name}
              noun="row"
              emptyTitle="Nothing here yet"
              emptyHint="Type in the row below and press Enter. You can add columns, formulas and links with the ＋ at the end of the header."
              headerEnd={
                <button
                  type="button"
                  aria-label="Add a column"
                  title="Add a column"
                  onClick={() => setColumnDialog({})}
                  className="h-7 w-7 rounded-ledger border border-paper-line bg-white font-bold text-stamp hover:bg-stamp-soft"
                >
                  ＋
                </button>
              }
              onRenameColumn={(column) => setRenaming(table.fields.find((f) => f.id === column.id) ?? null)}
              footRows={footRows}
              footEnd={
                <>
                  <span>
                    {data?.total ?? rows.length} {(data?.total ?? rows.length) === 1 ? 'row' : 'rows'}
                    {data && data.total > data.rows.length ? ` (showing ${data.rows.length})` : ''}
                  </span>
                  <span className="flex items-center gap-3">
                    {table.fnRows.map((fr) => (
                      <button key={fr.id} type="button" className="underline decoration-dotted" onClick={() => setFnRenaming(fr)} title="Rename this function row">
                        {fr.label} ✎
                      </button>
                    ))}
                    <button type="button" className="font-semibold text-stamp hover:underline" onClick={addFnRow}>
                      ＋ Function row
                    </button>
                  </span>
                </>
              }
              toolbarRight={<PostsButton on={table.rules.some((r) => r.enabled)} onClick={onRules} />}
              toolbarLeft={
                <>
                  <button
                    type="button"
                    aria-haspopup="menu"
                    onClick={(event) => openViewMenu(event.currentTarget.getBoundingClientRect())}
                    className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
                  >
                    {view?.name ?? 'All rows'} ▾
                  </button>
                  <button type="button" onClick={() => setFiltering(true)} className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft">
                    ＋ Filter
                  </button>
                  {[...viewFilters, ...filters].map((f, i) => {
                    const own = i >= viewFilters.length
                    return (
                      <span key={`${f.fieldId}-${i}`} className="flex items-center gap-1.5 rounded-full bg-stamp-soft px-2.5 py-1 text-[12px] text-ink">
                        {filterSentence(table, f)}
                        {own && (
                          <button type="button" aria-label="Remove this filter" onClick={() => setFilters((cur) => cur.filter((_, k) => k !== i - viewFilters.length))} className="font-bold text-ink-soft hover:text-rust">
                            ✕
                          </button>
                        )}
                      </span>
                    )
                  })}
                </>
              }
            />
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {rows.length === 0 && <li className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">No rows yet. Rows are added on a larger screen.</li>}
            {rows.map((row) => (
              <li key={row.id} className="rounded-ledger border border-paper-line bg-white px-4 py-3 text-[13.5px]">
                {table.fields.slice(0, 4).map((f) => (
                  <div key={f.id} className="flex justify-between gap-3">
                    <span className="text-ink-soft">{f.name}</span>
                    <span className="min-w-0 truncate text-right">{cellText(f, row)}</span>
                  </div>
                ))}
              </li>
            ))}
          </ul>
        </>
      )}

      {columnDialog && <ColumnDialog businessId={businessId} table={table} tables={tables} field={columnDialog.field} onClose={() => setColumnDialog(null)} />}
      {renaming && (
        <PromptDialog
          title="Rename column"
          label="Column name"
          initial={renaming.name}
          maxLength={60}
          validate={(value) => (value === '' ? 'Give the column a name.' : null)}
          onSubmit={(value) => {
            if (value === renaming.name) return
            void updateField
              .mutateAsync({ id: renaming.id, name: value })
              .then(() => toast(`Renamed to “${value}”. Formulas that use it were updated.`))
              .catch((err) => toast(messageOf(err)))
          }}
          onClose={() => setRenaming(null)}
        />
      )}
      {fnDialog && (
        <FnDialog
          businessId={businessId}
          table={table}
          field={fnDialog.field}
          rowLabel={fnDialog.row.label}
          current={fnDialog.row.cells[fnDialog.field.id]}
          onSave={(spec) => {
            const next = table.fnRows.map((fr) => {
              if (fr.id !== fnDialog.row.id) return fr
              const cells = { ...fr.cells }
              if (spec) cells[fnDialog.field.id] = spec
              else delete cells[fnDialog.field.id]
              return { ...fr, cells }
            })
            void saveFnRows(next)
          }}
          onClose={() => setFnDialog(null)}
        />
      )}
      {fnRenaming && (
        <PromptDialog
          title="Function row"
          label="Label (leave empty to delete this row)"
          initial={fnRenaming.label}
          maxLength={40}
          submitLabel="Save"
          onSubmit={(value) => void saveFnRows(value === '' ? table.fnRows.filter((r) => r.id !== fnRenaming.id) : table.fnRows.map((r) => (r.id === fnRenaming.id ? { ...r, label: value } : r)))}
          onClose={() => setFnRenaming(null)}
        />
      )}
      {filtering && <FilterDialog table={table} onAdd={(f) => setFilters((cur) => [...cur, f])} onClose={() => setFiltering(false)} />}
      {savingView && (
        <PromptDialog
          title="Save view"
          label="View name"
          initial=""
          maxLength={60}
          validate={(value) => (value === '' ? 'Give the view a name.' : null)}
          onSubmit={(value) => {
            void saveView
              .mutateAsync({ name: value, shared: true, config: { filters: [...viewFilters, ...filters], sort: null, hidden: [], order: [], widths: {} } })
              .then((v) => {
                setViewId(v.id)
                setFilters([])
                toast('View saved for everyone who can see this table.')
              })
              .catch((err) => toast(messageOf(err)))
          }}
          onClose={() => setSavingView(false)}
        />
      )}
      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
    </div>
  )
}
