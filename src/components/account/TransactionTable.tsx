import { useEffect, useRef, useState } from 'react'
import { useDeleteTransaction, openReceipt } from '../../lib/transactions'
import { formatMoney, formatShortDate } from '../../lib/format'
import { ApiError } from '../../lib/api-client'
import { safeProofHref } from '../../lib/proof-url'
import { summarizeSelection } from '../../lib/selection'
import type { Transaction } from '../../types/api'
import { ConfirmDialog } from '../ConfirmDialog'
import { SelectionBar } from './SelectionBar'

const HEADER_CELL = 'border-b border-paper-line px-5 py-3 text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase'

export function TransactionTable({
  businessId,
  transactions,
  currency,
  onEdit,
  paged = false,
}: {
  businessId: string
  transactions: Transaction[]
  currency: string
  onEdit: (transaction: Transaction) => void
  // Set when `transactions` is only one page of the entries (the selection bar then says so).
  paged?: boolean
}) {
  const deleteTransaction = useDeleteTransaction(businessId)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)
  const [tickedIds, setTickedIds] = useState<Set<string>>(new Set())
  const selectAllRef = useRef<HTMLInputElement>(null)

  // Only rows still in the table count, so a deleted or filtered-out entry
  // silently drops out of the selection.
  const selected = transactions.filter((tx) => tickedIds.has(tx.id))
  const allSelected = transactions.length > 0 && selected.length === transactions.length
  const someSelected = selected.length > 0 && !allSelected

  useEffect(() => {
    if (selectAllRef.current) selectAllRef.current.indeterminate = someSelected
  }, [someSelected])

  function toggleRow(id: string) {
    setTickedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setTickedIds(allSelected ? new Set() : new Set(transactions.map((tx) => tx.id)))
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await deleteTransaction.mutateAsync(pendingDeleteId)
    setPendingDeleteId(null)
  }

  async function handleViewInvoice(tx: Transaction) {
    setOpenError(null)
    setOpeningId(tx.id)
    try {
      await openReceipt(businessId, tx.id, tx.receiptFileName ?? 'invoice')
    } catch (err) {
      setOpenError(err instanceof ApiError ? err.message : 'Could not open that invoice.')
    } finally {
      setOpeningId(null)
    }
  }

  if (transactions.length === 0) {
    return <p className="px-5 py-8 text-sm text-ink-soft">No entries yet — add your first one above.</p>
  }

  return (
    // Room under the last row so the fixed selection bar never hides it.
    <div className={`overflow-x-auto ${selected.length > 0 ? 'pb-28' : ''}`}>
      <table className="w-full min-w-[620px] border-collapse">
        <thead>
          <tr className="bg-black/[0.02]">
            <th className="w-11 border-b border-paper-line py-3 pr-0 pl-5 text-left">
              <input
                ref={selectAllRef}
                type="checkbox"
                aria-label="Select all entries shown"
                checked={allSelected}
                onChange={toggleAll}
                className="h-4 w-4 accent-stamp"
              />
            </th>
            <th className={`${HEADER_CELL} text-left`}>Date</th>
            <th className={`${HEADER_CELL} text-left`}>Entry</th>
            <th className={`${HEADER_CELL} text-left`}>Category</th>
            <th className={`${HEADER_CELL} text-right`}>Amount</th>
            <th className={`${HEADER_CELL} text-right`}>Balance</th>
            <th className="border-b border-paper-line px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => {
            const isTicked = tickedIds.has(tx.id)
            const proofHref = safeProofHref(tx.proofUrl)
            return (
              <tr
                key={tx.id}
                className={`border-b border-paper-line transition-colors last:border-b-0 ${
                  isTicked ? 'bg-stamp-soft' : 'hover:bg-black/[0.02]'
                }`}
              >
                <td className="py-3.5 pr-0 pl-5 align-middle">
                  <input
                    type="checkbox"
                    aria-label={`Select ${tx.memo || tx.category?.name || 'entry'} on ${formatShortDate(tx.date)}`}
                    checked={isTicked}
                    onChange={() => toggleRow(tx.id)}
                    className="h-4 w-4 accent-stamp"
                  />
                </td>
                <td className="px-5 py-3.5 align-middle text-[13.5px] text-ink-soft whitespace-nowrap">
                  {formatShortDate(tx.date)}
                </td>
                <td className="px-5 py-3.5 align-middle">
                  <div className="font-medium">{tx.memo || (tx.category ? tx.category.name : '—')}</div>
                  {tx.counterparty && (
                    <div className="text-[12.5px] text-ink-soft">
                      {tx.type === 'INCOME' ? 'From ' : 'To '}
                      {tx.counterparty}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 align-middle">
                  {tx.category && (
                    <span className="inline-block rounded-[4px] border border-brass px-2 py-0.5 text-[11.5px] font-semibold tracking-wide text-brass uppercase">
                      {tx.category.name}
                    </span>
                  )}
                </td>
                <td
                  className={`tabular px-5 py-3.5 text-right align-middle font-medium ${tx.type === 'INCOME' ? 'text-green' : 'text-rust'}`}
                >
                  {tx.type === 'INCOME' ? '+' : '–'}
                  {formatMoney(tx.amount, currency)}
                </td>
                <td className="tabular px-5 py-3.5 text-right align-middle text-ink-soft">
                  {formatMoney(tx.runningBalance ?? 0, currency)}
                </td>
                <td className="px-5 py-3.5 text-right align-middle whitespace-nowrap">
                  {proofHref && (
                    // Opens the outside link in a new tab; the page that opened it gets no handle back.
                    <a
                      href={proofHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-stamp hover:underline"
                    >
                      Proof
                    </a>
                  )}
                  {tx.receiptFileName && (
                    <button
                      onClick={() => handleViewInvoice(tx)}
                      disabled={openingId === tx.id}
                      className={`${proofHref ? 'ml-3 ' : ''}text-xs text-stamp hover:underline disabled:opacity-50`}
                    >
                      {openingId === tx.id ? 'Opening…' : 'View invoice'}
                    </button>
                  )}
                  <button onClick={() => onEdit(tx)} className="ml-3 text-xs text-stamp hover:underline">
                    Edit
                  </button>
                  <button onClick={() => setPendingDeleteId(tx.id)} className="ml-3 text-xs text-ink-soft hover:text-rust">
                    Delete
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {openError && <p className="px-5 py-2 text-sm text-rust">{openError}</p>}

      {selected.length > 0 && (
        <SelectionBar summary={summarizeSelection(selected)} paged={paged} onClear={() => setTickedIds(new Set())} />
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this entry?"
          body="This cannot be undone."
          isPending={deleteTransaction.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  )
}
