import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useAccount } from '../lib/accounts'
import { useCategories } from '../lib/categories'
import { useTransactions } from '../lib/transactions'
import type { InvoiceScanResult } from '../lib/invoice-scan'
import type { CategoryBreakdown, Transaction } from '../types/api'
import { formatMoney } from '../lib/format'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { CategoryManager } from '../components/account/CategoryManager'
import { CategoryBreakdownPanel } from '../components/account/CategoryBreakdownPanel'
import { TransactionTable } from '../components/account/TransactionTable'
import { TransactionForm } from '../components/account/TransactionForm'
import { ScanInvoiceModal } from '../components/account/ScanInvoiceModal'
import { StatementPanel } from '../components/account/StatementPanel'
import { MonthlyPanel } from '../components/account/MonthlyPanel'

const TABS = [
  { id: 'entries', label: 'Entries' },
  { id: 'statement', label: 'Statement' },
  { id: 'monthly', label: 'Monthly view' },
] as const
type TabId = (typeof TABS)[number]['id']

function breakdownFromTransactions(transactions: Transaction[]): CategoryBreakdown[] {
  const buckets = new Map<string, CategoryBreakdown>()
  for (const tx of transactions) {
    if (tx.type !== 'EXPENSE') continue
    const key = tx.category?.id ?? 'uncategorized-expense'
    const name = tx.category?.name ?? 'Uncategorized expense'
    const existing = buckets.get(key)
    if (existing) {
      existing.total += tx.amount
    } else {
      buckets.set(key, { categoryId: tx.category?.id ?? null, categoryName: name, total: tx.amount })
    }
  }
  return [...buckets.values()].sort((a, b) => b.total - a.total)
}

export function AccountPage() {
  const { businessId, accountId } = useParams<{ businessId: string; accountId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: account } = useAccount(businessId, accountId)
  const { data: categories } = useCategories(businessId)
  const { data: transactions, isLoading } = useTransactions(businessId, accountId)
  const [searchParams, setSearchParams] = useSearchParams()
  // The tab lives in the address (?tab=statement) so it survives a reload and the back button.
  const requestedTab = searchParams.get('tab')
  const tab: TabId = TABS.some((t) => t.id === requestedTab) ? (requestedTab as TabId) : 'entries'

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)
  const [scanDefaults, setScanDefaults] = useState<InvoiceScanResult | undefined>(undefined)
  const [scanFile, setScanFile] = useState<File | undefined>(undefined)
  const [showScan, setShowScan] = useState(false)

  if (!businessId || !accountId) return null
  const currency = business?.currency ?? 'BDT'

  function openCreate() {
    setEditing(undefined)
    setScanDefaults(undefined)
    setScanFile(undefined)
    setShowForm(true)
  }

  function openEdit(tx: Transaction) {
    setEditing(tx)
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

  function selectTab(next: TabId) {
    setSearchParams(next === 'entries' ? {} : { tab: next }, { replace: true })
  }

  function handleScanned(result: InvoiceScanResult, file: File) {
    setShowScan(false)
    setEditing(undefined)
    setScanDefaults(result)
    setScanFile(file)
    setShowForm(true)
  }

  return (
    <>
      <Link to={`/businesses/${businessId}/accounts`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to accounts
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">{account?.name ?? 'Account'}</h1>
          {account && (
            <p className="tabular mt-1 text-[14px] text-ink-soft">Balance {formatMoney(account.balance, currency)}</p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={() => setShowScan(true)}>
            Upload invoice
          </Button>
          <Button onClick={openCreate}>+ Add entry</Button>
        </div>
      </div>

      <div role="tablist" aria-label="Account views" className="mb-6 flex gap-1 border-b border-paper-line">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls="account-tabpanel"
            onClick={() => selectTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
              tab === t.id ? 'border-stamp text-stamp' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id="account-tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'entries' && (
          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
            <Panel title="All entries" margined>
              {isLoading ? (
                <p className="px-5 py-8 text-sm text-ink-soft">Loading…</p>
              ) : (
                <TransactionTable
                  businessId={businessId}
                  transactions={transactions ?? []}
                  currency={currency}
                  onEdit={openEdit}
                />
              )}
            </Panel>

            <div className="flex flex-col gap-5">
              <CategoryManager businessId={businessId} categories={categories ?? []} />
              <CategoryBreakdownPanel byCategory={breakdownFromTransactions(transactions ?? [])} currency={currency} />
            </div>
          </div>
        )}
        {tab === 'statement' && <StatementPanel businessId={businessId} accountId={accountId} currency={currency} />}
        {tab === 'monthly' && <MonthlyPanel businessId={businessId} accountId={accountId} currency={currency} />}
      </div>

      {showScan && (
        <ScanInvoiceModal
          businessId={businessId}
          accountId={accountId}
          onScanned={handleScanned}
          onClose={() => setShowScan(false)}
        />
      )}

      {showForm && (
        <TransactionForm
          businessId={businessId}
          accountId={accountId}
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
