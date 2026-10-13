import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../lib/accounts'
import { useAuth } from '../lib/auth-context'
import { useBusiness } from '../lib/businesses'
import { useCategories } from '../lib/categories'
import { tablePrefsKey } from '../lib/grid-prefs'
import type { InvoiceScanResult } from '../lib/invoice-scan'
import { useToast } from '../lib/toast-context'
import { useTablePrefs } from '../lib/use-grid-prefs'
import type { Transaction } from '../types/api'
import { Button } from '../components/Button'
import type { MenuEntry } from '../components/FloatingMenu'
import { PromptDialog } from '../components/PromptDialog'
import { Select } from '../components/Select'
import { ScanInvoiceModal } from '../components/account/ScanInvoiceModal'
import { TransactionForm } from '../components/account/TransactionForm'
import { ImportWizardHost } from '../components/import/ImportWizardHost'
import { OrdersTab } from '../components/orders/OrdersTab'
import { CashBookTab } from '../components/workspace/CashBookTab'
import { WorkspaceTabs, type WorkspaceTab } from '../components/workspace/WorkspaceTabs'

interface BuiltInTable {
  key: string
  name: string
}

// The tables a business starts with. More arrive with later stages (Costs) and,
// after that, tables people make themselves.
const BUILT_IN_TABLES: BuiltInTable[] = [
  { key: 'cashbook', name: 'Cash book' },
  { key: 'orders', name: 'Orders' },
]

export function WorkspacePage() {
  const { businessId, accountId: accountIdParam } = useParams<{ businessId: string; accountId?: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const { data: categories } = useCategories(businessId)
  const tablePrefs = useTablePrefs(tablePrefsKey(user?.id ?? 'anonymous', businessId ?? ''))

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [scanDefaults, setScanDefaults] = useState<InvoiceScanResult | undefined>(undefined)
  const [scanFile, setScanFile] = useState<File | undefined>(undefined)
  const [showScan, setShowScan] = useState(false)
  const [renaming, setRenaming] = useState<BuiltInTable | null>(null)
  // The table whose Import button was clicked (the import screen is open), or null.
  const [importing, setImporting] = useState<string | null>(null)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  // The Cash book is the business's first account ("General account"); a business
  // that made more can reach the others by their own address.
  const account = accounts?.find((candidate) => candidate.id === accountIdParam) ?? accounts?.[0]

  const nameOf = (table: BuiltInTable) => tablePrefs.prefs.names[table.key] ?? table.name
  const visibleTables = BUILT_IN_TABLES.filter((table) => table.key === 'cashbook' || !tablePrefs.prefs.hidden.includes(table.key))
  const hiddenTables = BUILT_IN_TABLES.filter((table) => table.key !== 'cashbook' && tablePrefs.prefs.hidden.includes(table.key))
  const requested = searchParams.get('tab')
  const active = visibleTables.find((table) => table.key === requested) ?? visibleTables[0]

  function selectTab(key: string) {
    setSearchParams(key === 'cashbook' ? {} : { tab: key }, { replace: true })
  }

  function openOrder(orderId: string) {
    setSearchParams({ tab: 'orders', open: orderId })
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

  function menuFor(key: string): MenuEntry[] {
    const table = BUILT_IN_TABLES.find((candidate) => candidate.key === key)
    if (!table) return []
    const items: MenuEntry[] = [{ label: 'Rename table', onSelect: () => setRenaming(table) }]
    if (key !== 'cashbook') {
      items.push({
        label: 'Hide table',
        hint: 'Your rows are kept. Bring it back with ＋.',
        onSelect: () => {
          tablePrefs.hide(key)
          selectTab('cashbook')
          toast('Table hidden. Rows kept.', { undo: () => tablePrefs.show(key) })
        },
      })
    }
    return items
  }

  const tabs: WorkspaceTab[] = visibleTables.map((table) => ({ key: table.key, name: nameOf(table) }))

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">{nameOf(active)}</h1>
        </div>
        {active.key === 'cashbook' && account && (
          <div className="flex flex-wrap items-end gap-3">
            {accounts && accounts.length > 1 && (
              <div className="w-52">
                <Select
                  label="Cash book"
                  value={account.id}
                  onChange={(event) => navigate(`/businesses/${businessId}/accounts/${event.target.value}`)}
                >
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

      {active.key === 'cashbook' &&
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
            onOpenOrder={openOrder}
            onImport={() => setImporting('cashbook')}
            tableName={nameOf(active)}
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
      {active.key === 'orders' &&
        (account ? (
          <OrdersTab businessId={businessId} accountId={account.id} tableName={nameOf(active)} onImport={() => setImporting('orders')} />
        ) : (
          <p className="text-sm text-ink-soft">Loading…</p>
        ))}

      <div className="mt-3">
        <WorkspaceTabs
          tabs={tabs}
          activeKey={active.key}
          hidden={hiddenTables.map((table) => ({ key: table.key, name: nameOf(table) }))}
          onSelect={selectTab}
          menuFor={menuFor}
          onShow={(key) => {
            tablePrefs.show(key)
            selectTab(key)
          }}
        />
      </div>

      {importing && account && (
        <ImportWizardHost businessId={businessId} accountId={account.id} initialTableKey={importing} onClose={() => setImporting(null)} />
      )}

      {renaming && (
        <PromptDialog
          title="Rename table"
          label="Table name"
          initial={nameOf(renaming)}
          validate={(value) =>
            value !== '' && BUILT_IN_TABLES.some((table) => table.key !== renaming.key && nameOf(table).toLowerCase() === value.toLowerCase())
              ? 'You already have a table with this name.'
              : null
          }
          onSubmit={(value) => tablePrefs.rename(renaming.key, value, renaming.name)}
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
