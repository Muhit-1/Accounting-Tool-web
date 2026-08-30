import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useCreateLedger, useDeleteLedger, useLedgers } from '../lib/ledgers'
import { ApiError } from '../lib/api-client'
import { formatMoney } from '../lib/format'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { TextField } from '../components/TextField'
import { ConfirmDialog } from '../components/ConfirmDialog'

export function LedgersPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: ledgers, isLoading } = useLedgers(businessId)
  const createLedger = useCreateLedger(businessId ?? '')
  const deleteLedger = useDeleteLedger(businessId ?? '')

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
      await createLedger.mutateAsync(name)
      setName('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await deleteLedger.mutateAsync(pendingDeleteId)
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
          <h1 className="font-display text-[28px] font-medium tracking-tight">Ledgers</h1>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? 'Cancel' : '+ New ledger'}</Button>
      </div>

      <div className="max-w-2xl">
        <Panel title="This venture's books" margined>
          {showForm && (
            <form className="flex flex-col gap-3 border-b border-paper-line px-5 py-4" onSubmit={handleAdd}>
              <TextField
                label="Name"
                required
                autoFocus
                placeholder="e.g. Cash, Bank, Petty cash"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
              {error && <p className="text-sm text-rust">{error}</p>}
              <Button type="submit" disabled={createLedger.isPending} className="self-start">
                {createLedger.isPending ? 'Adding…' : 'Add ledger'}
              </Button>
            </form>
          )}

          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-soft">Loading…</p>
          ) : !ledgers || ledgers.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-soft">
              No ledgers yet — add one to start recording entries for this venture.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
                  {ledgers.map((ledger) => (
                    <tr key={ledger.id} className="border-b border-paper-line transition-colors last:border-b-0 hover:bg-black/[0.02]">
                      <td className="px-5 py-3.5 align-middle">
                        <Link
                          to={`/businesses/${businessId}/ledgers/${ledger.id}`}
                          className="font-medium hover:text-stamp"
                        >
                          {ledger.name}
                        </Link>
                      </td>
                      <td className="tabular px-5 py-3.5 text-right align-middle font-medium">
                        {formatMoney(ledger.balance, currency)}
                      </td>
                      <td className="px-5 py-3.5 text-right align-middle whitespace-nowrap">
                        <Link to={`/businesses/${businessId}/ledgers/${ledger.id}`} className="text-xs text-stamp hover:underline">
                          Open
                        </Link>
                        <button
                          onClick={() => setPendingDeleteId(ledger.id)}
                          className="ml-3 text-xs text-ink-soft hover:text-rust"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this ledger?"
          body="This deletes every entry in this ledger. This cannot be undone."
          isPending={deleteLedger.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </>
  )
}
