import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ApiError } from '../../lib/api-client'
import { blockedReason, buildDateFix, pickDateSource } from '../../lib/blocked-fix'
import { formatBalance } from '../../lib/home'
import { filterSentence } from '../../lib/table-filters'
import { previewRule, useBulkUpdateRows } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import type { EngineRow, EngineTable } from '../../types/engine'
import { IconLink } from '../icons'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

// The one line above a table that posts to the Cash book: the rule in a sentence and what it adds up to right now.
// When some rows match but cannot post (no usable date, a formula error) it says so and "Show them" lists them, with
// a one-click fix for the common case: copy another date column into the one the rule posts on.
export function PostingLine({
  businessId,
  table,
  currency,
  rows,
  canEdit,
}: {
  businessId: string
  table: EngineTable
  currency: string
  rows: EngineRow[]
  canEdit: boolean
}) {
  const toast = useToast()
  const queryClient = useQueryClient()
  const bulk = useBulkUpdateRows(businessId, table.id)
  const [open, setOpen] = useState(false)
  const rule = table.rules.find((r) => r.enabled)
  const { data } = useQuery({
    queryKey: ['rule-preview', businessId, table.id, rule?.id, rule?.config],
    queryFn: () => previewRule(businessId, table.id, (rule as NonNullable<typeof rule>).config),
    enabled: Boolean(rule),
    staleTime: 5_000,
  })
  if (!rule) return null
  const c = rule.config
  const into = c.direction === 'IN'
  const when = c.conditions.length > 0 ? c.conditions.map((f) => filterSentence(table, f)).join(' and ') : null
  const subject = when ? `Rows where ${when}` : 'Every row'
  const verb = into ? (when ? 'add' : 'adds') : when ? 'take' : 'takes'
  const amount = data ? formatBalance(Math.abs(data.total), currency) : null
  const blocked = data?.blockedRows ?? []
  const hasBlocked = (data?.blocked ?? 0) > 0

  const source = pickDateSource(table, c)
  const dateField = table.fields.find((f) => f.id === c.dateFieldId)
  const fix = source && dateField ? buildDateFix(blocked, rows, dateField.id, source.id) : null

  async function applyFix() {
    if (!fix || fix.updates.length === 0) return
    try {
      await bulk.mutateAsync(fix.updates)
      await queryClient.invalidateQueries({ queryKey: ['rule-preview', businessId, table.id] })
      setOpen(false)
      toast(`${plural(fix.updates.length, 'row now has', 'rows now have')} a date and ${fix.updates.length === 1 ? 'was' : 'were'} added to the Cash book.`)
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not change the rows. Please try again.')
    }
  }

  return (
    <div className="relative flex h-9 items-center gap-2.5 border-b border-brass-line bg-brass-row px-4 text-[14px] text-brass" aria-label="Posts to the Cash book">
      <IconLink width={16} height={16} className="flex-none" />
      <span className="min-w-0 truncate">
        {!data && (
          <>
            {subject} {into ? 'go to' : 'come out of'} the Cash book
          </>
        )}
        {data && !hasBlocked && (
          <>
            {subject} {verb} <b className="tabular font-semibold">{amount}</b> {into ? 'to' : 'out of'} the Cash book
          </>
        )}
        {data && hasBlocked && (
          <>
            <b className="tabular font-semibold">{amount}</b> {into ? 'added to' : 'taken out of'} the Cash book from {plural(data.posting, 'row', 'rows')}.{' '}
            <b className="font-semibold">{plural(data.blocked, 'row', 'rows')}</b> {data.blocked === 1 ? 'has' : 'have'} {blockedReason(blocked)}, so {data.blocked === 1 ? 'it is' : 'they are'} not in yet.
          </>
        )}
      </span>
      {hasBlocked && (
        <button type="button" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="ml-auto flex-none text-[13px] font-semibold underline underline-offset-[3px]">
          Show them
        </button>
      )}

      {open && hasBlocked && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="dialog" aria-label="Rows that cannot post" className="absolute top-full right-4 z-50 mt-1 w-[460px] max-w-[92vw] rounded-[12px] border border-paper-line bg-white p-3.5 text-ink shadow-[0_12px_32px_rgba(15,42,74,0.18)]">
            <h4 className="font-display text-[16px] font-bold">
              {plural(data?.blocked ?? 0, 'row', 'rows')} cannot post yet
            </h4>
            <p className="mt-0.5 mb-2 text-[14px] text-ink-soft2">The Cash book needs {blockedReason(blocked) === 'a formula error' ? 'a working amount' : 'a date'} for each one.</p>
            <ul>
              {blocked.slice(0, 8).map((b) => (
                <li key={b.rowId} className="flex h-10 items-center gap-3 border-t border-paper-edge text-[14px]">
                  <b className="font-semibold">{b.label}</b>
                  <span className="text-ink-soft2">{b.reason === 'date' ? 'no usable date' : 'formula error'}</span>
                  {b.amount !== null && <b className="tabular ml-auto font-semibold">{formatBalance(b.amount, currency)}</b>}
                </li>
              ))}
            </ul>
            {(data?.blocked ?? 0) > 8 && <p className="border-t border-paper-edge pt-2 text-[13px] text-ink-soft2">and {(data?.blocked ?? 0) - 8} more</p>}
            {fix && fix.missing > 0 && fix.updates.length > 0 && (
              <p className="border-t border-paper-edge pt-2 text-[13px] text-ink-soft2">
                {plural(fix.missing, 'row has', 'rows have')} no “{source?.name}” either, so {fix.missing === 1 ? 'it stays' : 'they stay'} as {fix.missing === 1 ? 'it is' : 'they are'}.
              </p>
            )}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="h-[34px] rounded-ledger bg-paper px-3.5 text-[13px] font-semibold hover:bg-paper-edge">
                Close
              </button>
              {canEdit && fix && fix.updates.length > 0 && source && dateField && (
                <button type="button" disabled={bulk.isPending} onClick={() => void applyFix()} className="h-[34px] rounded-ledger bg-stamp px-3.5 text-[13px] font-semibold text-white hover:bg-stamp/90 disabled:opacity-60">
                  Set “{dateField.name}” to “{source.name}”
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
