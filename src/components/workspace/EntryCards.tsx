import { formatMoney, formatShortDate } from '../../lib/format'
import type { Transaction } from '../../types/api'
import { IconLink } from '../icons'

// Phones get cards, not a grid: a tap opens the same entry form as before.
export function EntryCards({
  transactions,
  currency,
  onEdit,
  onOpenOrder,
}: {
  transactions: Transaction[]
  currency: string
  onEdit: (transaction: Transaction) => void
  onOpenOrder: (orderId: string) => void
}) {
  if (transactions.length === 0) {
    return (
      <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">
        No entries yet — add your first one above.
      </p>
    )
  }
  // Newest first on a small screen: what happened last is what you look for.
  const list = [...transactions].reverse()
  return (
    <ul className="flex flex-col gap-2">
      {list.map((tx) => {
        const posted = tx.orderId !== null
        return (
          <li key={tx.id}>
            <button
              type="button"
              onClick={() => (tx.orderId ? onOpenOrder(tx.orderId) : onEdit(tx))}
              className={`flex w-full items-start justify-between gap-3 rounded-ledger border px-4 py-3 text-left ${posted ? 'border-brass-line bg-brass-row' : 'border-paper-line bg-white'}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{tx.memo || tx.category?.name || '—'}</span>
                <span className="block text-[12.5px] text-ink-soft">
                  {formatShortDate(tx.date)}
                  {tx.category ? ` · ${tx.category.name}` : ''}
                </span>
                {posted && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-brass-soft px-2 py-px text-[11px] font-bold text-brass">
                    <IconLink width={11} height={11} /> Orders
                  </span>
                )}
              </span>
              <span className="flex-none text-right">
                <span className={`tabular block font-medium ${tx.type === 'INCOME' ? 'text-green' : 'text-rust'}`}>
                  {tx.type === 'INCOME' ? '+' : '–'}
                  {formatMoney(tx.amount, currency)}
                </span>
                <span className="tabular block text-xs text-ink-soft">{formatMoney(tx.runningBalance ?? 0, currency)}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
