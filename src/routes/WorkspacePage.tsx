import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../lib/accounts'
import { ApiError } from '../lib/api-client'
import { useBusiness } from '../lib/businesses'
import { useCategories } from '../lib/categories'
import type { InvoiceScanResult } from '../lib/invoice-scan'
import { useApplyTemplate, useCreateTable, useDeleteTable, useDuplicateTable, useReorderTables, useRestoreTable, useTables, useTemplates, useUpdateTable } from '../lib/tables'
import { loadZoom, saveZoom, stepZoom, zoomLabel, ZOOM_STEPS } from '../lib/sheet-zoom'
import { CASHBOOK_KEY, pickTabKey } from '../lib/workspace-landing'
import { useToast } from '../lib/toast-context'
import type { Transaction } from '../types/api'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { FloatingMenu, type MenuEntry } from '../components/FloatingMenu'
import { PromptDialog } from '../components/PromptDialog'
import { Select } from '../components/Select'
import { ScanInvoiceModal } from '../components/account/ScanInvoiceModal'
import { TransactionForm } from '../components/account/TransactionForm'
import { ImportWizardHost } from '../components/import/ImportWizardHost'
import { SheetImportDialog } from '../components/import/SheetImportDialog'
import { TableRulesDialog } from '../components/tables/TableRulesDialog'
import { TableTab } from '../components/tables/TableTab'
import { CashBookTab } from '../components/workspace/CashBookTab'
import { StartStrip } from '../components/workspace/StartPrompts'
import { TableTabs, type TabInfo } from '../components/workspace/TableTabs'
import { WorkspaceChromeContext } from '../components/workspace/workspace-chrome'

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

// The colours a sheet can have (the dot and the stripe on its tab).
const TAB_COLORS = [
  { name: 'Blue', hex: '#2457d6' },
  { name: 'Green', hex: '#157a3c' },
  { name: 'Orange', hex: '#d97a06' },
  { name: 'Purple', hex: '#7c4dff' },
  { name: 'Pink', hex: '#c2185b' },
  { name: 'Teal', hex: '#00838f' },
]

// The Workspace: the Cash book and every sheet of the business. The tabs and the toolbar stay pinned to the top, and the
// sheet is the page: it fills the width and the page scrolls once, with the column letters and the summary row kept in view.
export function WorkspacePage() {
  const { businessId, accountId: accountIdParam } = useParams<{ businessId: string; accountId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const { data: categories } = useCategories(businessId)
  const { data: engineTables } = useTables(businessId)
  const { data: templates } = useTemplates(businessId)
  const createTable = useCreateTable(businessId ?? '')
  const updateTable = useUpdateTable(businessId ?? '')
  const deleteTable = useDeleteTable(businessId ?? '')
  const restoreTable = useRestoreTable(businessId ?? '')
  const reorderTables = useReorderTables(businessId ?? '')
  const applyTemplate = useApplyTemplate(businessId ?? '')
  const duplicateTable = useDuplicateTable(businessId ?? '')

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [scanDefaults, setScanDefaults] = useState<InvoiceScanResult | undefined>(undefined)
  const [scanFile, setScanFile] = useState<File | undefined>(undefined)
  const [showScan, setShowScan] = useState(false)
  const [renaming, setRenaming] = useState<{ key: string; name: string } | null>(null)
  const [deleting, setDeleting] = useState<{ id: string; name: string } | null>(null)
  // The Cash book's Import button was clicked (the import screen is open).
  const [importing, setImporting] = useState<string | null>(null)
  const [uploadingSheet, setUploadingSheet] = useState(false)
  const [newMenu, setNewMenu] = useState<DOMRect | null>(null)
  // The engine table whose "Posts to Cash book" rules are open.
  const [rulesTableId, setRulesTableId] = useState<string | null>(null)

  // The pinned top (tabs, toolbar) and how tall it is, so the column letters stick right under it.
  const [toolbarHost, setToolbarHost] = useState<HTMLDivElement | null>(null)
  const [barHost, setBarHost] = useState<HTMLDivElement | null>(null)
  // Zoom of the sheet (the toolbar and the tabs keep their size). Ctrl or ⌘ + the mouse wheel zooms too.
  const [zoom, setZoomState] = useState(loadZoom)
  const content = useRef<HTMLDivElement>(null)
  const setZoom = (next: number) => {
    setZoomState(next)
    saveZoom(next)
  }
  useEffect(() => {
    const element = content.current
    if (!element) return
    function onWheel(event: WheelEvent) {
      if (!event.ctrlKey && !event.metaKey) return
      event.preventDefault()
      setZoomState((current) => {
        const next = stepZoom(current, event.deltaY < 0 ? 1 : -1)
        saveZoom(next)
        return next
      })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])
  const head = useRef<HTMLDivElement>(null)
  const [headHeight, setHeadHeight] = useState(0)
  // The sheet can be wider than the window. The pinned top and the tabs stay as wide as the window, so they stay in
  // view while the sheet scrolls sideways under them.
  const [viewWidth, setViewWidth] = useState(0)
  useEffect(() => {
    const element = head.current
    if (!element) return
    const page = element.closest('main')
    const measure = () => {
      setHeadHeight(element.offsetHeight)
      if (page) setViewWidth(page.clientWidth)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (page) observer.observe(page)
    return () => observer.disconnect()
  }, [])

  // The Dashboard's welcome card sends people here with something to open.
  const start = searchParams.get('do')
  useEffect(() => {
    if (start !== 'templates') return
    const timer = window.setTimeout(() => {
      const button = document.querySelector('[data-new-sheet]')
      if (button) setNewMenu(button.getBoundingClientRect())
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          next.delete('do')
          return next
        },
        { replace: true },
      )
    }, 80)
    return () => window.clearTimeout(timer)
  }, [start, setSearchParams])

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  // The Cash book is the business's first account ("General account"); a business
  // that made more can reach the others by their own address.
  const account = accounts?.find((candidate) => candidate.id === accountIdParam) ?? accounts?.[0]

  // Every table of the business, in one list.
  const engine = engineTables ?? []
  const keyOf = (t: { id: string; kind: string }) => (t.kind === 'LEDGER' ? CASHBOOK_KEY : t.id)
  // Someone who was given only some tables (never the Cash book) sees just those: no New table, no menus.
  const restricted = engineTables !== undefined && !engineTables.some((t) => t.kind === 'LEDGER')
  const tabs: TabInfo[] = engine.map((t) => ({ key: keyOf(t), name: t.name, color: t.color, ledger: t.kind === 'LEDGER', movable: !restricted, posts: t.rules.some((r) => r.enabled) }))
  // A business nobody has touched yet: at most one table of its own, nothing in it, and an empty Cash book.
  const ownTables = engine.filter((t) => t.kind === 'TABLE')
  const ledgerRows = engine.find((t) => t.kind === 'LEDGER')?.rowCount ?? 0
  const isFresh = !restricted && engineTables !== undefined && ownTables.length <= 1 && ownTables.every((t) => t.rowCount === 0) && ledgerRows === 0
  // The address names the tab; a Cash book address (/accounts/:id) means the Cash book. With none, a business nobody
  // has touched opens on its first table, every other one on its first tab (see lib/workspace-landing.ts).
  const requested = searchParams.get('tab') ?? (accountIdParam ? CASHBOOK_KEY : null)
  const activeKey = pickTabKey(engine, requested)
  const active = tabs.find((t) => t.key === activeKey)
  const activeEngine = active ? engine.find((t) => keyOf(t) === active.key) : undefined

  function selectTab(key: string) {
    setSearchParams({ tab: key }, { replace: true })
  }

  // A gold Cash book row leads back to the table that posted it.
  function openPosted(transaction: Transaction) {
    if (transaction.source) setSearchParams({ tab: transaction.source.tableId })
    else if (transaction.invoiceId) navigate(`/businesses/${businessId}/invoices/${transaction.invoiceId}`)
  }

  function openCreate() {
    setEditing(undefined)
    setScanDefaults(undefined)
    setScanFile(undefined)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
    setScanDefaults(undefined)
    setScanFile(undefined)
  }

  async function newBlankTable() {
    try {
      const t = await createTable.mutateAsync({})
      selectTab(t.id)
    } catch (err) {
      toast(messageOf(err))
    }
  }

  async function removeTable(id: string, name: string) {
    try {
      await deleteTable.mutateAsync(id)
      selectTab('cashbook')
      toast(`“${name}” deleted. It stays in the Trash for 30 days.`, {
        undo: () => {
          void restoreTable.mutateAsync(id).then((t) => selectTab(t.id)).catch((err) => toast(messageOf(err)))
        },
      })
    } catch (err) {
      toast(messageOf(err))
    }
  }

  function menuFor(key: string): MenuEntry[] {
    if (restricted) return []
    const t = engine.find((x) => keyOf(x) === key)
    if (!t) return []
    const items: MenuEntry[] = [{ label: 'Rename', hint: 'Or double-click the tab.', onSelect: () => setRenaming({ key, name: t.name }) }]
    if (t.kind === 'LEDGER') {
      items.push('separator', { label: 'The Cash book cannot be deleted', disabled: true })
      return items
    }
    items.push(
      { label: 'Make a copy', hint: 'The columns, formulas and totals, without the rows.', onSelect: () => void copyTable(t.id, t.name, false) },
      { label: 'Make a copy with its rows', onSelect: () => void copyTable(t.id, t.name, true) },
    )
    items.push({ label: 'Posts to Cash book…', hint: t.rules.some((r) => r.enabled) ? 'On' : 'Off', onSelect: () => setRulesTableId(t.id) })
    items.push(
      { heading: 'Color' },
      ...TAB_COLORS.map((c) => ({
        label: c.name,
        swatch: c.hex,
        checked: t.color?.toLowerCase() === c.hex,
        onSelect: () => void updateTable.mutateAsync({ id: t.id, color: c.hex }).catch((err) => toast(messageOf(err))),
      })),
    )
    items.push('separator', { label: 'Delete table…', danger: true, onSelect: () => setDeleting({ id: t.id, name: t.name }) })
    return items
  }

  function moveTabs(keys: string[]) {
    const ids = keys.map((k) => engine.find((t) => keyOf(t) === k)?.id).filter((id): id is string => Boolean(id))
    void reorderTables.mutateAsync(ids).catch((err) => toast(messageOf(err)))
  }

  async function copyTable(id: string, name: string, withRows: boolean) {
    try {
      const made = await duplicateTable.mutateAsync({ tableId: id, withRows })
      selectTab(made.id)
      toast(`“${name}” copied.${made.skippedColumns.length > 0 ? ` Left out: ${made.skippedColumns.join(', ')} (they add up another table).` : ''}`)
    } catch (err) {
      toast(messageOf(err))
    }
  }

  async function addTemplate(key: string) {
    try {
      const made = await applyTemplate.mutateAsync(key)
      if (made[0]) selectTab(made[0].id)
      toast(made.length > 1 ? `${made.length} tables added.` : 'Table added.')
    } catch (err) {
      toast(messageOf(err))
    }
  }

  const templateItems: MenuEntry[] = (templates ?? []).map((t) => ({ label: t.name, hint: t.description, onSelect: () => void addTemplate(t.key) }))
  const newMenuItems: MenuEntry[] = [
    { label: 'Blank table', hint: 'An empty table. Type in it like a spreadsheet.', onSelect: () => void newBlankTable() },
    { heading: 'Start from a template' },
    ...templateItems,
    'separator',
    { label: 'Upload my Excel or Google Sheet…', hint: 'Tables, formulas and links are rebuilt.', onSelect: () => setUploadingSheet(true) },
  ]

  const accountSwitcher =
    accounts && accounts.length > 1 && account ? (
      <div className="w-44">
        <Select label="Cash book" value={account.id} onChange={(event) => navigate(`/businesses/${businessId}/accounts/${event.target.value}`)}>
          {accounts.map((candidate) => (
            <option key={candidate.id} value={candidate.id}>
              {candidate.name}
            </option>
          ))}
        </Select>
      </div>
    ) : null

  return (
    <WorkspaceChromeContext.Provider value={{ toolbarHost, barHost }}>
      <div style={{ ['--ws-top' as string]: `${headHeight}px` }} className="flex min-h-full w-max min-w-full flex-col bg-white">
        <div ref={head} style={viewWidth ? { width: viewWidth } : undefined} className="sticky top-0 left-0 z-20 bg-white">
          {/* The sheet's toolbar is for a larger screen; a phone gets the cards and the + button. */}
          <div ref={setToolbarHost} className="hidden md:block" />
          <div ref={setBarHost} />
          {isFresh && active && active.key === ownTables[0]?.id && <StartStrip businessId={businessId} onUpload={() => setUploadingSheet(true)} onTemplates={setNewMenu} />}
        </div>

        <div ref={content} style={{ zoom, ['--ws-top' as string]: `${headHeight / zoom}px` }} className="min-h-0 flex-1 px-4 py-4 md:p-0">
          {active?.key === CASHBOOK_KEY &&
            (account ? (
              <CashBookTab
                key={account.id}
                businessId={businessId}
                accountId={account.id}
                currency={currency}
                onEditEntry={(transaction) => {
                  setEditing(transaction)
                  setScanDefaults(undefined)
                  setScanFile(undefined)
                  setShowForm(true)
                }}
                onOpenPosted={openPosted}
                onImport={() => setImporting('cashbook')}
                onAddEntry={openCreate}
                onScanInvoice={() => setShowScan(true)}
                accountSwitcher={accountSwitcher}
                tableName={active.name}
              />
            ) : (
              <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">
                {accounts ? (
                  <>
                    This business has no cash book yet. <Link to={`/businesses/${businessId}/accounts`} className="text-stamp underline">Add one</Link>.
                  </>
                ) : (
                  'Loading…'
                )}
              </p>
            ))}
          {activeEngine && activeEngine.kind === 'TABLE' && <TableTab key={activeEngine.id} businessId={businessId} table={activeEngine} tables={engine} currency={currency} onRules={() => setRulesTableId(activeEngine.id)} />}
        </div>

        {/* The tables are tabs at the bottom, as in a spreadsheet. */}
        <div style={viewWidth ? { width: viewWidth } : undefined} className="sticky bottom-0 left-0 z-20 flex items-start bg-paper">
          <div className="min-w-0 flex-1">
          <TableTabs
            tabs={tabs}
            activeKey={active?.key ?? ''}
            onSelect={selectTab}
            menuFor={menuFor}
            onNew={restricted ? undefined : setNewMenu}
            onMove={moveTabs}
            onRename={(key) => {
              const t = engine.find((x) => keyOf(x) === key)
              if (t && !restricted) setRenaming({ key, name: t.name })
            }}
          />
          </div>
          <div role="group" aria-label="Zoom" className="hidden flex-none items-center gap-0.5 self-center px-3 md:flex">
            <button type="button" aria-label="Zoom out" title="Zoom out (or Ctrl + scroll)" disabled={zoom <= ZOOM_STEPS[0]} onClick={() => setZoom(stepZoom(zoom, -1))} className="h-7 w-7 rounded-md text-[17px] leading-none text-ink-soft hover:bg-white disabled:opacity-40">
              −
            </button>
            <button type="button" title="Back to 100%" onClick={() => setZoom(1)} className="min-w-[46px] rounded-md px-1 py-1 text-center text-[12px] font-semibold text-ink-soft hover:bg-white">
              {zoomLabel(zoom)}
            </button>
            <button type="button" aria-label="Zoom in" title="Zoom in (or Ctrl + scroll)" disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => setZoom(stepZoom(zoom, 1))} className="h-7 w-7 rounded-md text-[17px] leading-none text-ink-soft hover:bg-white disabled:opacity-40">
              +
            </button>
          </div>
        </div>
      </div>

      {active?.key === CASHBOOK_KEY && account && !restricted && (
        <button
          type="button"
          onClick={openCreate}
          aria-label="Add an entry"
          className="fixed right-4 bottom-[88px] z-30 flex h-14 w-14 items-center justify-center rounded-[18px] bg-stamp text-white shadow-[0_6px_16px_rgba(28,109,208,0.4)] md:hidden"
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}

      {rulesTableId && engine.find((t) => t.id === rulesTableId) && (
        <TableRulesDialog key={rulesTableId} businessId={businessId} table={engine.find((t) => t.id === rulesTableId) as (typeof engine)[number]} onClose={() => setRulesTableId(null)} />
      )}

      {newMenu && <FloatingMenu anchor={newMenu} items={newMenuItems} onClose={() => setNewMenu(null)} />}

      {(uploadingSheet || start === 'upload') && account && (
        <SheetImportDialog
          businessId={businessId}
          accountId={account.id}
          onClose={() => {
            setUploadingSheet(false)
            if (start === 'upload') {
              setSearchParams(
                (current) => {
                  const next = new URLSearchParams(current)
                  next.delete('do')
                  return next
                },
                { replace: true },
              )
            }
          }}
          onCreated={(firstTableId) => {
            if (firstTableId) selectTab(firstTableId)
          }}
        />
      )}

      {importing && account && <ImportWizardHost businessId={businessId} accountId={account.id} initialTableKey={importing} onClose={() => setImporting(null)} />}

      {deleting && (
        <ConfirmDialog
          title={`Delete “${deleting.name}”?`}
          body="It moves to the Trash for 30 days, and you can bring it back from there or press Undo right after."
          confirmLabel="Delete table"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            const target = deleting
            setDeleting(null)
            void removeTable(target.id, target.name)
          }}
        />
      )}

      {renaming && (
        <PromptDialog
          title="Rename table"
          label="Table name"
          initial={renaming.name}
          maxLength={60}
          validate={(value) => {
            if (value === '') return 'Give the table a name.'
            if (/[{}[\]']/.test(value)) return 'A table name can’t contain { } [ ] or an apostrophe.'
            return tabs.some((t) => t.key !== renaming.key && t.name.toLowerCase() === value.toLowerCase()) ? 'You already have a table with this name.' : null
          }}
          onSubmit={(value) => {
            const t = engine.find((x) => keyOf(x) === renaming.key)
            if (t) void updateTable.mutateAsync({ id: t.id, name: value }).then(() => toast('Renamed. Formulas that use this table were updated.')).catch((err) => toast(messageOf(err)))
          }}
          onClose={() => setRenaming(null)}
        />
      )}

      {showScan && account && (
        <ScanInvoiceModal
          businessId={businessId}
          accountId={account.id}
          onScanned={(result, file) => {
            setShowScan(false)
            setEditing(undefined)
            setScanDefaults(result)
            setScanFile(file)
            setShowForm(true)
          }}
          onClose={() => setShowScan(false)}
        />
      )}

      {showForm && account && (
        <TransactionForm
          businessId={businessId}
          accountId={account.id}
          categories={categories ?? []}
          currency={currency}
          transaction={editing}
          initialAmount={scanDefaults?.amount}
          initialDate={scanDefaults?.date}
          initialCounterparty={scanDefaults?.counterparty}
          pendingReceiptFile={scanFile}
          onClose={closeForm}
        />
      )}
    </WorkspaceChromeContext.Provider>
  )
}
