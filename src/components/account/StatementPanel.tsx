import { useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { formatAmount } from '../../lib/format'
import { useFundStatement } from '../../lib/statements'
import type { StatementGroup, StatementSide } from '../../types/api'
import { Panel } from '../Panel'
import { TextField } from '../TextField'

const OTHER_GROUP = 'Other'

function Tile({ label, value, tone }: { label: string; value: number; tone?: 'in' | 'out' }) {
  const color = tone === 'in' ? 'text-green' : tone === 'out' ? 'text-rust' : 'text-ink'
  return (
    <div className="rounded-ledger border border-paper-line bg-white px-4 py-3.5">
      <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">{label}</div>
      <div className={`tabular text-[22px] font-medium ${color}`}>{formatAmount(value)}</div>
    </div>
  )
}

function Row({
  label,
  caption,
  entries,
  total,
  indent,
  strong,
}: {
  label: string
  caption?: string
  entries: number
  total: number
  indent?: boolean
  strong?: boolean
}) {
  return (
    <tr className="border-b border-paper-line">
      <td className={`py-2.5 pr-2 ${indent ? 'pl-10' : 'pl-5'} ${strong ? 'font-semibold' : ''}`}>
        {label}
        {caption && <span className="ml-2 text-[12px] font-normal text-ink-soft">{caption}</span>}
      </td>
      <td className="tabular px-2 py-2.5 text-right text-ink-soft">{entries}</td>
      <td className={`tabular py-2.5 pr-5 pl-2 text-right ${strong ? 'font-semibold' : ''}`}>{formatAmount(total)}</td>
    </tr>
  )
}

// A group with one category is one row (the category, with the group as a
// caption); a group with several is a heading row with its categories under it.
function GroupRows({ group }: { group: StatementGroup }) {
  if (group.categories.length === 1) {
    const [only] = group.categories
    return (
      <Row
        label={only.name}
        caption={group.name === OTHER_GROUP ? undefined : group.name}
        entries={only.entries}
        total={only.total}
      />
    )
  }
  return (
    <>
      <Row label={group.name} entries={group.entries} total={group.total} strong />
      {group.categories.map((category) => (
        <Row key={category.categoryId ?? 'none'} label={category.name} entries={category.entries} total={category.total} indent />
      ))}
    </>
  )
}

function Side({ title, side, tone }: { title: string; side: StatementSide; tone: 'in' | 'out' }) {
  const bar = tone === 'in' ? 'bg-green-soft text-green' : 'bg-rust-soft text-rust'
  return (
    <>
      <tr className={bar}>
        <td colSpan={3} className="px-5 py-2 text-xs font-bold tracking-wider uppercase">
          {title}
        </td>
      </tr>
      {side.groups.map((group) => (
        <GroupRows key={group.name} group={group} />
      ))}
      <tr className="border-b border-paper-line">
        <td colSpan={2} className="px-5 py-2.5 font-bold">
          Total {title.toLowerCase()}
        </td>
        <td className={`tabular py-2.5 pr-5 pl-2 text-right font-medium ${tone === 'in' ? 'text-green' : 'text-rust'}`}>
          {formatAmount(side.total)}
        </td>
      </tr>
    </>
  )
}

// Money in and out for one account, grouped by category group, with the
// balance. Dates are optional: left empty it covers every date.
export function StatementPanel({ businessId, accountId, currency }: { businessId: string; accountId: string; currency: string }) {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const rangeInvalid = from !== '' && to !== '' && from > to
  const { data, isLoading, error } = useFundStatement(businessId, {
    accountId,
    from: rangeInvalid ? undefined : from || undefined,
    to: rangeInvalid ? undefined : to || undefined,
  })

  const isEmpty = data !== undefined && data.moneyIn.entries === 0 && data.moneyOut.entries === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <TextField label="From" type="date" value={from} max={to || undefined} onChange={(event) => setFrom(event.target.value)} />
        <TextField label="To" type="date" value={to} min={from || undefined} onChange={(event) => setTo(event.target.value)} />
        {(from || to) && (
          <button
            type="button"
            onClick={() => {
              setFrom('')
              setTo('')
            }}
            className="pb-2.5 text-[13px] text-stamp underline underline-offset-2"
          >
            All dates
          </button>
        )}
      </div>
      {rangeInvalid && <p className="text-sm text-rust">“From” is after “To”.</p>}

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error instanceof ApiError ? error.message : 'Could not load the statement.'}
        </p>
      ) : isLoading || !data ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Tile label="Total money in" value={data.moneyIn.total} tone="in" />
            <Tile label="Total money out" value={data.moneyOut.total} tone="out" />
            <Tile label="Balance" value={data.balance} />
          </div>

          <Panel title="Fund statement" action={<span className="text-[12.5px] text-ink-soft">Entries · Amount ({currency})</span>}>
            {isEmpty ? (
              <p className="px-5 py-8 text-sm text-ink-soft">No entries for these dates.</p>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <tbody>
                  <Side title="Money in" side={data.moneyIn} tone="in" />
                  <Side title="Money out" side={data.moneyOut} tone="out" />
                  <tr className="bg-stamp-soft">
                    <td colSpan={2} className="px-5 py-3 font-bold text-ink">
                      Balance <span className="font-normal text-ink-soft">· money in − money out</span>
                    </td>
                    <td className="tabular py-3 pr-5 pl-2 text-right text-[17px] font-medium text-ink">
                      {formatAmount(data.balance)}
                    </td>
                  </tr>
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </div>
  )
}
