import { Link } from 'react-router-dom'
import type { TransactionWithBusiness } from '../../lib/transactions'
import { formatMoney, formatShortDate } from '../../lib/format'
import { Panel } from '../Panel'

export function RecentEntriesPanel({
  transactions,
  showBusiness,
  businessId,
  isLoading,
}: {
  transactions: TransactionWithBusiness[]
  showBusiness: boolean
  businessId?: string
  isLoading: boolean
}) {
  const recent = transactions.slice(0, 8)

  return (
    <Panel
      title="Recent entries"
      margined
      action={
        businessId ? (
          <Link
            to={`/businesses/${businessId}/ledgers`}
            className="border-b border-current text-[13px] text-stamp no-underline"
          >
            Open ledgers
          </Link>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">
          No entries yet — they'll appear here once bookkeeping is recorded.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-black/[0.02]">
              <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
                Entry
              </th>
              <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
                Category
              </th>
              <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {recent.map((tx) => (
              <tr key={tx.id} className="border-b border-paper-line transition-colors last:border-b-0 hover:bg-black/[0.02]">
                <td className="px-5 py-3.5 align-middle">
                  <div className="font-medium">{tx.memo || (tx.category ? tx.category.name : 'Entry')}</div>
                  <div className="text-[12.5px] text-ink-soft">
                    {showBusiness ? `${tx.businessName} · ` : ''}
                    {formatShortDate(tx.date)}
                  </div>
                </td>
                <td className="px-5 py-3.5 align-middle">
                  {tx.category && (
                    <span className="inline-block rounded-[4px] border border-brass px-2 py-0.5 text-[11.5px] font-semibold tracking-wide text-brass uppercase">
                      {tx.category.name}
                    </span>
                  )}
                </td>
                <td
                  className={`tabular px-5 py-3.5 text-right align-middle font-medium ${
                    tx.type === 'INCOME' ? 'text-green' : 'text-rust'
                  }`}
                >
                  {tx.type === 'INCOME' ? '+' : '–'}
                  {formatMoney(tx.amount, tx.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Panel>
  )
}
