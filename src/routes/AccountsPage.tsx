import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useCreateAccount, useDeleteAccount, useAccounts } from '../lib/accounts'
import { useViewMode } from '../lib/view-mode'
import { ApiError } from '../lib/api-client'
import { formatMoney } from '../lib/format'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { TextField } from '../components/TextField'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { ViewToggle } from '../components/ViewToggle'
import { IconTrash, IconWallet } from '../components/icons'
import type { Account } from '../types/api'

function AccountGrid({
  accounts,
  businessId,
  currency,
  onDelete,
}: {
  accounts: Account[]
  businessId: string
  currency: string
  onDelete: (id: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/businesses/${businessId}/accounts/${account.id}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') navigate(`/businesses/${businessId}/accounts/${account.id}`)
          }}
          className="group relative flex cursor-pointer flex-col gap-3 rounded-ledger border border-paper-line bg-white p-4 text-left transition-colors hover:border-stamp"
        >
          <button
            onClick={(event) => {
              event.stopPropagation()
              onDelete(account.id)
            }}
            aria-label={`Delete ${account.name}`}
            className="absolute top-3 right-3 flex h-7 w-7 items-center justify-center rounded-[6px] text-ink-soft opacity-0 transition-opacity hover:bg-rust-soft hover:text-rust group-hover:opacity-100"
          >
            <IconTrash width={15} height={15} />
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-stamp-soft text-stamp">
            <IconWallet width={19} height={19} />
          </span>
          <div>
            <div className="text-[15px] font-semibold">{account.name}</div>
            <div className={`tabular mt-0.5 text-[14px] ${account.balance < 0 ? 'text-rust' : 'text-ink-soft'}`}>
              {formatMoney(account.balance, currency)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function AccountTable({
  accounts,
  businessId,
  currency,
  onDelete,
}: {
  accounts: Account[]
  businessId: string
  currency: string
  onDelete: (id: string) => void
}) {
  return (
    <div className="overflow-x-auto rounded-ledger border border-paper-line bg-white">
      <table className="w-full min-w-[480px] border-collapse">
        <thead>
          <tr className="bg-black/[0.02]">
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Name
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Balance
            </th>
            <th className="border-b border-paper-line px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="border-b border-paper-line transition-colors last:border-b-0 hover:bg-black/[0.02]">
              <td className="px-5 py-3.5 align-middle">
                <Link to={`/businesses/${businessId}/accounts/${account.id}`} className="font-medium hover:text-stamp">
                  {account.name}
                </Link>
              </td>
              <td className="tabular px-5 py-3.5 text-right align-middle font-medium">
                {formatMoney(account.balance, currency)}
              </td>
              <td className="px-5 py-3.5 text-right align-middle whitespace-nowrap">
                <Link to={`/businesses/${businessId}/accounts/${account.id}`} className="text-xs text-stamp hover:underline">
                  Open
                </Link>
                <button onClick={() => onDelete(account.id)} className="ml-3 text-xs text-ink-soft hover:text-rust">
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function AccountsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: accounts, isLoading } = useAccounts(businessId)
  const createAccount = useCreateAccount(businessId ?? '')
  const deleteAccount = useDeleteAccount(businessId ?? '')
  const [viewMode, setViewMode] = useViewMode('accounts')

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createAccount.mutateAsync(name)
      setName('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await deleteAccount.mutateAsync(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Accounts</h1>
        </div>
        <div className="flex items-center gap-3">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New account'}</Button>
        </div>
      </div>

      {showForm && (
        <Panel title="New account" margined>
          <form className="flex flex-col gap-3 px-5 py-4" onSubmit={handleAdd}>
            <TextField
              label="Name"
              required
              autoFocus
              placeholder="e.g. Cash, Bank, Petty cash"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="max-w-sm"
            />
            {error && <p className="text-sm text-rust">{error}</p>}
            <Button type="submit" disabled={createAccount.isPending} className="self-start">
              {createAccount.isPending ? 'Adding…' : 'Add account'}
            </Button>
          </form>
        </Panel>
      )}

      <div className={showForm ? 'mt-5' : ''}>
        {isLoading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : !accounts || accounts.length === 0 ? (
          <p className="rounded-ledger border border-dashed border-paper-line bg-white px-5 py-8 text-center text-sm text-ink-soft">
            No accounts yet — add one to start recording entries for this venture.
          </p>
        ) : viewMode === 'grid' ? (
          <AccountGrid accounts={accounts} businessId={businessId} currency={currency} onDelete={setPendingDeleteId} />
        ) : (
          <AccountTable accounts={accounts} businessId={businessId} currency={currency} onDelete={setPendingDeleteId} />
        )}
      </div>

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this account?"
          body="This deletes every entry in this account. This cannot be undone."
          isPending={deleteAccount.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  )
}
