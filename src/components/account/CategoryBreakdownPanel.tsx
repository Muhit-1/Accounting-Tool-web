import type { CategoryBreakdown } from '../../types/api'
import { formatMoney } from '../../lib/format'
import { Panel } from '../Panel'

export function CategoryBreakdownPanel({
  byCategory,
  currency,
  title = 'Spend by category',
}: {
  byCategory: CategoryBreakdown[]
  currency: string
  title?: string
}) {
  const scale = Math.max(...byCategory.map((c) => Math.abs(c.total)), 1)

  return (
    <Panel title={title}>
      {byCategory.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Nothing recorded yet.</p>
      ) : (
        byCategory.map((category) => (
          <div key={category.categoryId ?? category.categoryName} className="border-b border-paper-edge px-5 py-3 last:border-b-0">
            <div className="mb-1.5 flex justify-between text-[14px]">
              <span>{category.categoryName}</span>
              <span className="tabular font-medium">{formatMoney(category.total, currency)}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-paper-line">
              <div
                className="h-full rounded-full bg-stamp"
                style={{ width: `${(Math.abs(category.total) / scale) * 100}%` }}
              />
            </div>
          </div>
        ))
      )}
    </Panel>
  )
}
