import { useState } from 'react'
import { useDeleteTransaction } from '../../lib/transactions'
import { formatMoney, formatShortDate } from '../../lib/format'
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

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await deleteTransaction.mutateAsync(pendingDeleteId)
    setPendingDeleteId(null)
  }

  if (transactions.length === 0) {
    return <p className="px-5 py-8 text-sm text-ink-soft">No entries yet — add your first one above.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr>
            <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
              Date
            </th>
            <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
              Entry
            </th>
            <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
              Category
            </th>
            <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
              Amount
            </th>
            <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
              Balance
            </th>
            <th className="border-b border-paper-line px-5 py-2.5" />
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-paper-edge transition-colors last:border-b-0 hover:bg-black/[0.02]">
              <td className="px-5 py-3 align-middle text-[13.5px] text-ink-soft whitespace-nowrap">
                {formatShortDate(tx.date)}
              </td>
              <td className="px-5 py-3 align-middle font-medium">{tx.memo || (tx.category ? tx.category.name : '—')}</td>
              <td className="px-5 py-3 align-middle">
                {tx.category && (
                  <span className="inline-block rounded-full border border-current bg-brass-soft px-2 py-0.5 text-[11.5px] text-brass">
                    {tx.category.name}
                  </span>
                )}
              </td>
              <td className={`tabular px-5 py-3 text-right align-middle font-medium ${tx.type === 'INCOME' ? 'text-green' : 'text-rust'}`}>
                {tx.type === 'INCOME' ? '+' : '–'}
                {formatMoney(tx.amount, currency)}
              </td>
              <td className="tabular px-5 py-3 text-right align-middle text-ink-soft">
                {formatMoney(tx.runningBalance ?? 0, currency)}
              </td>
              <td className="px-5 py-3 text-right align-middle whitespace-nowrap">
                <button onClick={() => onEdit(tx)} className="text-xs text-stamp hover:underline">
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
