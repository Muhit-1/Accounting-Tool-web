import { useQuery } from '@tanstack/react-query'
import { filterSentence } from '../../lib/table-filters'
import { previewRule } from '../../lib/tables'
import type { EngineTable } from '../../types/engine'
import { formatBalance } from '../../lib/home'
import { IconLink } from '../icons'

// Above a sheet that posts to the Cash book: the rule in a sentence and what it adds up to right now.
export function MoneyStrip({ businessId, table, currency, onOpenRule }: { businessId: string; table: EngineTable; currency: string; onOpenRule: () => void }) {
  const rule = table.rules.find((r) => r.enabled)
  const { data } = useQuery({
    queryKey: ['rule-preview', businessId, table.id, rule?.id, rule?.config],
    queryFn: () => previewRule(businessId, table.id, (rule as NonNullable<typeof rule>).config),
    enabled: Boolean(rule),
    staleTime: 5_000,
  })
  if (!rule) return null
  const c = rule.config
  const when = c.conditions.length > 0 ? c.conditions.map((f) => filterSentence(table, f)).join(' and ') : 'every row'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-brass-line bg-brass-row px-4 py-2 text-[13px] text-ink">
      <button type="button" onClick={onOpenRule} className="inline-flex items-center gap-1.5 rounded-full border border-brass-line bg-white px-2.5 py-0.5 text-[12px] font-semibold text-brass hover:bg-brass-soft" title="Change which rows go to the Cash book">
        <IconLink width={13} height={13} />
        Posts to Cash book
      </button>
      <span>
        When <b className="font-semibold">{when}</b> → money {c.direction === 'IN' ? 'in' : 'out'}
        {data ? (
          <>
            {' '}
            <b className="tabular font-semibold text-brass">{formatBalance(data.total, currency)}</b> from {data.posting} {data.posting === 1 ? 'row' : 'rows'}
            {data.blocked > 0 && <span className="text-rust"> · {data.blocked} could not post</span>}
          </>
        ) : null}
      </span>
    </div>
  )
}
