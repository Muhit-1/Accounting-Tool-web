import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../lib/accounts'
import { ApiError } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import { useBusiness } from '../lib/businesses'
import { useCategories } from '../lib/categories'
import { tablePrefsKey } from '../lib/grid-prefs'
import { DEFAULT_POSTING_CONFIG, tablePosts, usePostingConfig, type PostingTable } from '../lib/posting-config'
import type { InvoiceScanResult } from '../lib/invoice-scan'
import { useApplyTemplate, useCreateTable, useDeleteTable, useReorderTables, useRestoreTable, useTables, useTemplates, useUpdateTable } from '../lib/tables'
import { useToast } from '../lib/toast-context'
import { useTablePrefs } from '../lib/use-grid-prefs'
import type { Transaction } from '../types/api'
import { Button } from '../components/Button'
import { FloatingMenu, type MenuEntry } from '../components/FloatingMenu'
import { PromptDialog } from '../components/PromptDialog'
import { Select } from '../components/Select'
import { ScanInvoiceModal } from '../components/account/ScanInvoiceModal'
import { TransactionForm } from '../components/account/TransactionForm'
import { ImportWizardHost } from '../components/import/ImportWizardHost'
import { CostsTab } from '../components/costs/CostsTab'
import { OrdersTab } from '../components/orders/OrdersTab'
import { TableRulesDialog } from '../components/tables/TableRulesDialog'
import { TableTab } from '../components/tables/TableTab'
import { CashBookTab } from '../components/workspace/CashBookTab'
import { PostingDialog } from '../components/workspace/PostingDialog'
import { PostsButton } from '../components/workspace/PostsButton'
import { TableTabs, type TabInfo } from '../components/workspace/TableTabs'

// Until the Orders and Costs templates replace them, these two older tables sit after the engine's tables.
const LEGACY = [
  { key: 'orders', name: 'Orders' },
  { key: 'costs', name: 'Costs' },
]
const isLegacy = (key: string) => LEGACY.some((t) => t.key === key)
const isPostingTable = (key: string): key is PostingTable => key === 'orders' || key === 'costs' || key === 'invoices'
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

export function WorkspacePage() {
  const { businessId, accountId: accountIdParam } = useParams<{ businessId: string; accountId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const { data: categories } = useCategories(businessId)
  const { data: postingData } = usePostingConfig(businessId)
  const { data: engineTables } = useTables(businessId)
  const { data: templates } = useTemplates(businessId)
  const postingConfig = postingData ?? DEFAULT_POSTING_CONFIG
  const tablePrefs = useTablePrefs(tablePrefsKey(user?.id ?? 'anonymous', businessId ?? ''))
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
  // The table whose Import button was clicked (the import screen is open), or null.
  const [importing, setImporting] = useState<string | null>(null)
  // The table whose "Posts to Cash book" dialog is open, or null.
  const [postingTable, setPostingTable] = useState<PostingTable | null>(null)
  const [newMenu, setNewMenu] = useState<DOMRect | null>(null)
  // The engine table whose "Posts to Cash book" rules are open.
  const [rulesTableId, setRulesTableId] = useState<string | null>(null)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  // The Cash book is the business's first account ("General account"); a business
  // that made more can reach the others by their own address.
  const account = accounts?.find((candidate) => candidate.id === accountIdParam) ?? accounts?.[0]

  // Every table, in one list: the engine's tables in their order, then the two older ones.
  const engine = engineTables ?? []
  const keyOf = (t: { id: string; kind: string }) => (t.kind === 'LEDGER' ? 'cashbook' : t.id)
  const hiddenLegacy = LEGACY.filter((t) => tablePrefs.prefs.hidden.includes(t.key))
  const legacyNameOf = (key: string) => tablePrefs.prefs.names[key] ?? LEGACY.find((t) => t.key === key)?.name ?? key
  const tabs: TabInfo[] = [
    ...engine.map((t) => ({ key: keyOf(t), name: t.name, color: t.color, ledger: t.kind === 'LEDGER', movable: true, posts: t.rules.some((r) => r.enabled) })),
    ...LEGACY.filter((t) => !tablePrefs.prefs.hidden.includes(t.key)).map((t) => ({
      key: t.key,
      name: legacyNameOf(t.key),
      posts: isPostingTable(t.key) && tablePosts(postingConfig, t.key),
    })),
  ]
  const requested = searchParams.get('tab')
  const active = tabs.find((t) => t.key === requested) ?? tabs[0]
  const activeEngine = active ? engine.find((t) => keyOf(t) === active.key) : undefined

  function selectTab(key: string) {
    setSearchParams(key === 'cashbook' ? {} : { tab: key }, { replace: true })
  }

  // A gold Cash book row leads back to the table that posted it.
  function openPosted(transaction: Transaction) {
    if (transaction.source) setSearchParams({ tab: transaction.source.tableId })
    else if (transaction.orderId) setSearchParams({ tab: 'orders', open: transaction.orderId })
    else if (transaction.costItemId) setSearchParams({ tab: 'costs' })
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
      toast(`“${name}” deleted. Its rows stay in Trash for 30 days.`, {
        undo: () => {
          void restoreTable.mutateAsync(id).then((t) => selectTab(t.id)).catch((err) => toast(messageOf(err)))
        },
      })
    } catch (err) {
      toast(messageOf(err))
    }
  }

  function menuFor(key: string): MenuEntry[] {
    if (isLegacy(key)) {
      const items: MenuEntry[] = [{ label: 'Rename table', onSelect: () => setRenaming({ key, name: legacyNameOf(key) }) }]
      if (isPostingTable(key)) items.push({ label: 'Posts to Cash book…', hint: 'Choose what this table sends.', onSelect: () => setPostingTable(key) })
      items.push({
        label: 'Hide table',
        hint: 'Your rows are kept. Bring it back with ＋.',
        onSelect: () => {
          tablePrefs.hide(key)
          selectTab('cashbook')
          toast('Table hidden. Rows kept.', { undo: () => tablePrefs.show(key) })
        },
      })
      return items
    }
    const t = engine.find((x) => keyOf(x) === key)
    if (!t) return []
    const items: MenuEntry[] = [{ label: 'Rename table', onSelect: () => setRenaming({ key, name: t.name }) }]
    if (t.kind === 'TABLE') items.push({ label: 'Posts to Cash book…', hint: 'Choose what this table sends.', onSelect: () => setRulesTableId(t.id) })
    if (t.kind === 'TABLE') items.push('separator', { label: 'Delete table', hint: 'Rows stay in Trash for 30 days.', onSelect: () => void removeTable(t.id, t.name) })
    return items
  }

  function moveTabs(keys: string[]) {
    const ids = keys.map((k) => engine.find((t) => keyOf(t) === k)?.id).filter((id): id is string => Boolean(id))
    void reorderTables.mutateAsync(ids).catch((err) => toast(messageOf(err)))
  }

  const postsButton = (key: PostingTable) => <PostsButton on={tablePosts(postingConfig, key)} onClick={() => setPostingTable(key)} />

  async function addTemplate(key: string) {
    try {
      const made = await applyTemplate.mutateAsync(key)
      if (made[0]) selectTab(made[0].id)
      toast(made.length > 1 ? `${made.length} tables added.` : 'Table added.')
    } catch (err) {
      toast(messageOf(err))
    }
  }

  const newMenuItems: MenuEntry[] = [
    { label: 'Blank table', hint: 'An empty sheet with five columns.', onSelect: () => void newBlankTable() },
    'separator',
    ...(templates ?? []).map((t) => ({ label: t.name, hint: t.description, onSelect: () => void addTemplate(t.key) })),
    'separator',
    { label: 'Upload a sheet…', hint: 'Excel or CSV.', onSelect: () => setImporting('cashbook') },
    ...hiddenLegacy.map((t) => ({ label: `Show ${legacyNameOf(t.key)}`, hint: 'Your rows are still there.', onSelect: () => { tablePrefs.show(t.key); selectTab(t.key) } })),
  ]

  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">{active?.name ?? '…'}</h1>
        </div>
        {active?.key === 'cashbook' && account && (
          <div className="flex flex-wrap items-end gap-3">
            {accounts && accounts.length > 1 && (
              <div className="w-52">
                <Select label="Cash book" value={account.id} onChange={(event) => navigate(`/businesses/${businessId}/accounts/${event.target.value}`)}>
                  {accounts.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <Button variant="ghost" onClick={() => setShowScan(true)}>
              Upload invoice
            </Button>
            <Button onClick={openCreate}>+ Add entry</Button>
          </div>
        )}
      </div>

      <div className="mb-4">
        <TableTabs tabs={tabs} activeKey={active?.key ?? ''} onSelect={selectTab} menuFor={menuFor} onNew={setNewMenu} onMove={moveTabs} />
      </div>

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
      {active?.key === 'orders' &&
        (account ? (
          <OrdersTab businessId={businessId} accountId={account.id} tableName={active.name} onImport={() => setImporting('orders')} postsButton={postsButton('orders')} />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        ))}
      {active?.key === 'costs' && (
        <CostsTab businessId={businessId} currency={currency} tableName={active.name} onImport={() => setImporting('costs')} postsButton={postsButton('costs')} />
      )}

      {rulesTableId && engine.find((t) => t.id === rulesTableId) && (
        <TableRulesDialog key={rulesTableId} businessId={businessId} table={engine.find((t) => t.id === rulesTableId) as (typeof engine)[number]} onClose={() => setRulesTableId(null)} />
      )}

      {newMenu && <FloatingMenu anchor={newMenu} items={newMenuItems} onClose={() => setNewMenu(null)} />}

      {importing && account && <ImportWizardHost businessId={businessId} accountId={account.id} initialTableKey={importing} onClose={() => setImporting(null)} />}

      {postingTable && (
        <PostingDialog businessId={businessId} table={postingTable} tableName={legacyNameOf(postingTable)} config={postingConfig} onClose={() => setPostingTable(null)} />
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
            if (isLegacy(renaming.key)) {
              tablePrefs.rename(renaming.key, value, LEGACY.find((t) => t.key === renaming.key)?.name ?? value)
              return
            }
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
    </>
  )
}
