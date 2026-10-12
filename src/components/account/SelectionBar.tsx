import { createPortal } from 'react-dom'
import { formatAmount } from '../../lib/format'
import type { SelectionSummary } from '../../lib/selection'

function Figure({ label, value }: { label: string; value: number | null }) {
  return (
    <div>
      <div className="text-[11px] tracking-wider text-ink-inverse-soft uppercase">{label}</div>
      <div className="tabular text-[15px] font-medium">{value === null ? '—' : formatAmount(value)}</div>
    </div>
  )
}

// Fixed to the bottom while one or more rows are ticked. Numbers only; nothing
// is saved. When money in and out are both ticked the amounts are signed and
// the sum is a net, said in the one short label on the Sum figure.
export function SelectionBar({
  summary,
  paged,
  onClear,
}: {
  summary: SelectionSummary
  // The table shows only part of the entries, so the numbers cover this page only.
  paged?: boolean
  onClear: () => void
}) {
  const mixed = summary.kind === 'mixed'
  const kindLabel = summary.kind === 'in' ? 'Money in' : summary.kind === 'out' ? 'Money out' : 'In and out'

  // In a portal so no transform on a parent can turn "fixed" into "relative to that parent".
  return createPortal(
    <div
      role="region"
      aria-label="Selected entries"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink text-white shadow-[0_-4px_16px_rgba(15,42,74,0.2)] md:left-[248px]"
    >
      <div className="flex flex-wrap items-center gap-x-7 gap-y-2 px-5 py-3.5 md:px-10">
        <div>
          <div className="text-[13.5px] font-bold">
            {summary.count} selected{paged ? ' on this page' : ''}
          </div>
          <div className="text-[11px] tracking-wider text-ink-inverse-soft uppercase">{kindLabel}</div>
        </div>
        <div className="flex flex-wrap gap-x-7 gap-y-2">
          <Figure label={mixed ? 'Net (in − out)' : 'Sum'} value={summary.sum} />
          <Figure label="Average" value={summary.average} />
          <Figure label="Min" value={summary.min} />
          <Figure label="Max" value={summary.max} />
        </div>
        <button
          type="button"
          onClick={onClear}
          className="ml-auto rounded-[4px] text-[13px] font-semibold text-stamp-soft underline underline-offset-2"
        >
          Clear selection
        </button>
      </div>
    </div>,
    document.body,
  )
}
