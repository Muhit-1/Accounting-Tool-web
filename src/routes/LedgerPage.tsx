import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useBusinessDashboard } from '../lib/dashboard'
import { useCategories } from '../lib/categories'
import { useTransactions } from '../lib/transactions'
import type { Transaction } from '../types/api'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { CategoryManager } from '../components/ledger/CategoryManager'
import { CategoryBreakdownPanel } from '../components/ledger/CategoryBreakdownPanel'
import { TransactionTable } from '../components/ledger/TransactionTable'
import { TransactionForm } from '../components/ledger/TransactionForm'

export function LedgerPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: dashboard } = useBusinessDashboard(businessId)
  const { data: categories } = useCategories(businessId)
  const { data: transactions, isLoading } = useTransactions(businessId)

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Transaction | undefined>(undefined)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  function openCreate() {
    setEditing(undefined)
    setShowForm(true)
  }

  function openEdit(tx: Transaction) {
    setEditing(tx)
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-medium tracking-tight">Full ledger</h1>
        </div>
        <Button onClick={openCreate}>+ Add entry</Button>
      </div>

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
          <CategoryBreakdownPanel byCategory={dashboard?.byCategory ?? []} currency={currency} />
        </div>
      </div>

      {showForm && (
        <TransactionForm
          businessId={businessId}
          categories={categories ?? []}
          transaction={editing}
          onClose={closeForm}
        />
      )}
    </>
  )
}
