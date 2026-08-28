import type { TransactionWithBusiness } from '../../lib/transactions'
import { formatMoney, formatShortDate } from '../../lib/format'
import { Panel } from './Panel'

export function RecentEntriesPanel({
  transactions,
  showBusiness,
  isLoading,
}: {
  transactions: TransactionWithBusiness[]
  showBusiness: boolean
  isLoading: boolean
}) {
  const recent = transactions.slice(0, 8)

  return (
    <Panel title="Recent entries" margined>
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">
          No entries yet — they'll appear here once bookkeeping is recorded.
        </p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
                Entry
              </th>
              <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
                Category
              </th>
              <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {recent.map((tx) => (
              <tr key={tx.id} className="border-b border-paper-edge transition-colors last:border-b-0 hover:bg-black/[0.02]">
                <td className="px-5 py-3 align-middle">
                  <div className="font-medium">{tx.memo || (tx.category ? tx.category.name : 'Entry')}</div>
                  <div className="text-[12.5px] text-ink-soft">
                    {showBusiness ? `${tx.businessName} · ` : ''}
                    {formatShortDate(tx.date)}
                  </div>
                </td>
                <td className="px-5 py-3 align-middle">
                  {tx.category && (
                    <span className="inline-block rounded-full border border-current bg-brass-soft px-2 py-0.5 text-[11.5px] text-brass">
                      {tx.category.name}
                    </span>
                  )}
                </td>
                <td
                  className={`tabular px-5 py-3 text-right align-middle font-medium ${
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
