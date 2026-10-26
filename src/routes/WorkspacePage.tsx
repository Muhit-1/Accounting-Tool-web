import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../lib/accounts'
import { ApiError } from '../lib/api-client'
import { useBusiness } from '../lib/businesses'
import { useCategories } from '../lib/categories'
import type { InvoiceScanResult } from '../lib/invoice-scan'
import { useApplyTemplate, useCreateTable, useDeleteTable, useReorderTables, useRestoreTable, useTables, useTemplates, useUpdateTable } from '../lib/tables'
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
  const head = useRef<HTMLDivElement>(null)
  const [headHeight, setHeadHeight] = useState(0)
  useEffect(() => {
    const element = head.current
    if (!element) return
    const measure = () => setHeadHeight(element.offsetHeight)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
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
  const keyOf = (t: { id: string; kind: string }) => (t.kind === 'LEDGER' ? 'cashbook' : t.id)
  // Someone who was given only some tables (never the Cash book) sees just those: no New sheet, no menus.
  const restricted = engineTables !== undefined && !engineTables.some((t) => t.kind === 'LEDGER')
  const tabs: TabInfo[] = engine.map((t) => ({ key: keyOf(t), name: t.name, color: t.color, ledger: t.kind === 'LEDGER', movable: !restricted, posts: t.rules.some((r) => r.enabled) }))
  // A business nobody has touched yet: at most one sheet of its own, nothing in it, and an empty Cash book.
  const ownTables = engine.filter((t) => t.kind === 'TABLE')
  const ledgerRows = engine.find((t) => t.kind === 'LEDGER')?.rowCount ?? 0
  const isFresh = !restricted && engineTables !== undefined && ownTables.length <= 1 && ownTables.every((t) => t.rowCount === 0) && ledgerRows === 0
  const requested = searchParams.get('tab')
  const active = tabs.find((t) => t.key === requested) ?? tabs[0]
  const activeEngine = active ? engine.find((t) => keyOf(t) === active.key) : undefined

  function selectTab(key: string) {
    setSearchParams(key === 'cashbook' ? {} : { tab: key }, { replace: true })
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
    items.push('separator', { label: 'Delete sheet…', danger: true, onSelect: () => setDeleting({ id: t.id, name: t.name }) })
    return items
  }

  function moveTabs(keys: string[]) {
    const ids = keys.map((k) => engine.find((t) => keyOf(t) === k)?.id).filter((id): id is string => Boolean(id))
    void reorderTables.mutateAsync(ids).catch((err) => toast(messageOf(err)))
  }

  async function addTemplate(key: string) {
    try {
      const made = await applyTemplate.mutateAsync(key)
      if (made[0]) selectTab(made[0].id)
      toast(made.length > 1 ? `${made.length} sheets added.` : 'Sheet added.')
    } catch (err) {
      toast(messageOf(err))
    }
  }

  const templateItems: MenuEntry[] = (templates ?? []).map((t) => ({ label: t.name, hint: t.description, onSelect: () => void addTemplate(t.key) }))
  const newMenuItems: MenuEntry[] = [
    { label: 'Blank sheet', hint: 'An empty sheet. Type in it like a spreadsheet.', onSelect: () => void newBlankTable() },
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
    <WorkspaceChromeContext.Provider value={{ toolbarHost }}>
      <div style={{ ['--ws-top' as string]: `${headHeight}px` }} className="min-h-full bg-white">
        <div ref={head} className="sticky top-0 left-0 z-20 bg-white">
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
          <div ref={setToolbarHost} />
          {isFresh && active?.key === 'cashbook' && <StartStrip businessId={businessId} onUpload={() => setUploadingSheet(true)} onTemplates={setNewMenu} />}
        </div>

        <div className="px-4 py-4 md:p-0">
          {active?.key === 'cashbook' &&
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
          {activeEngine && activeEngine.kind === 'TABLE' && <TableTab key={activeEngine.id} businessId={businessId} table={activeEngine} tables={engine} onRules={() => setRulesTableId(activeEngine.id)} />}
        </div>
      </div>

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
          confirmLabel="Delete sheet"
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
          title="Rename sheet"
          label="Sheet name"
          initial={renaming.name}
          maxLength={60}
          validate={(value) => {
            if (value === '') return 'Give the sheet a name.'
            if (/[{}[\]']/.test(value)) return 'A sheet name can’t contain { } [ ] or an apostrophe.'
            return tabs.some((t) => t.key !== renaming.key && t.name.toLowerCase() === value.toLowerCase()) ? 'You already have a sheet with this name.' : null
          }}
          onSubmit={(value) => {
            const t = engine.find((x) => keyOf(x) === renaming.key)
            if (t) void updateTable.mutateAsync({ id: t.id, name: value }).then(() => toast('Renamed. Formulas that use this sheet were updated.')).catch((err) => toast(messageOf(err)))
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
