import { useState } from 'react'
import { useDeleteTransaction, openReceipt } from '../../lib/transactions'
import { formatMoney, formatShortDate } from '../../lib/format'
import { ApiError } from '../../lib/api-client'
import type { Transaction } from '../../types/api'
import { ConfirmDialog } from '../ConfirmDialog'

export function TransactionTable({
  businessId,
  transactions,
  currency,
  onEdit,
}: {
  businessId: string
  transactions: Transaction[]
  currency: string
  onEdit: (transaction: Transaction) => void
}) {
  const deleteTransaction = useDeleteTransaction(businessId)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [openError, setOpenError] = useState<string | null>(null)

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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-black/[0.02]">
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Date
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Entry
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Category
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Amount
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Balance
            </th>
            <th className="border-b border-paper-line px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-paper-line transition-colors last:border-b-0 hover:bg-black/[0.02]">
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
              <td className={`tabular px-5 py-3.5 text-right align-middle font-medium ${tx.type === 'INCOME' ? 'text-green' : 'text-rust'}`}>
                {tx.type === 'INCOME' ? '+' : '–'}
                {formatMoney(tx.amount, currency)}
              </td>
              <td className="tabular px-5 py-3.5 text-right align-middle text-ink-soft">
                {formatMoney(tx.runningBalance ?? 0, currency)}
              </td>
              <td className="px-5 py-3.5 text-right align-middle whitespace-nowrap">
                {tx.receiptFileName && (
                  <button
                    onClick={() => handleViewInvoice(tx)}
                    disabled={openingId === tx.id}
                    className="text-xs text-stamp hover:underline disabled:opacity-50"
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
          ))}
        </tbody>
      </table>

      {openError && <p className="px-5 py-2 text-sm text-rust">{openError}</p>}

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
