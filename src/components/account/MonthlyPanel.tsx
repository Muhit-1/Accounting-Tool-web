import { useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { formatAmount } from '../../lib/format'
import { defaultStartMonth, monthLabel, useMonthly } from '../../lib/statements'
import { Panel } from '../Panel'
import { Select } from '../Select'
import { TextField } from '../TextField'
import { MonthlyBarChart } from './MonthlyBarChart'

const MONTH_CHOICES = [6, 12, 24]

function signed(value: number): string {
  if (value === 0) return formatAmount(0)
  return `${value > 0 ? '+' : '−'}${formatAmount(Math.abs(value))}`
}

const HEAD = 'border-b border-paper-line px-3 py-2.5 text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase'

// Money in / out / net / closing balance for each month of a window, a bar
// chart, and a check that nothing falls outside the months shown.
export function MonthlyPanel({ businessId, accountId, currency }: { businessId: string; accountId?: string; currency: string }) {
  const [months, setMonths] = useState(12)
  // null = follow the default: the window that ends this month.
  const [chosenStart, setChosenStart] = useState<string | null>(null)
  const start = chosenStart ?? defaultStartMonth(months)
  const { data, isLoading, error } = useMonthly(businessId, { accountId, start, months })

  const outside = data?.outsideRange
  const allCounted = outside !== undefined && outside.moneyIn === 0 && outside.moneyOut === 0

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4">
        <TextField
          label="Start month"
          type="month"
          min="2000-01"
          required
          value={start}
          onChange={(event) => event.target.value && setChosenStart(event.target.value)}
        />
        <Select label="Months" value={months} onChange={(event) => setMonths(Number(event.target.value))}>
          {MONTH_CHOICES.map((choice) => (
            <option key={choice} value={choice}>
              {choice}
            </option>
          ))}
        </Select>
      </div>

      {error ? (
        <p className="text-sm text-rust" role="alert">
          {error instanceof ApiError ? error.message : 'Could not load the monthly view.'}
        </p>
      ) : isLoading || !data ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <Panel
            title="Monthly view"
            action={
              <span className="flex gap-3.5 text-[12.5px] text-ink-soft">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-green" />
                  Money in
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block h-2.5 w-2.5 rounded-[2px] bg-rust" />
                  Money out
                </span>
              </span>
            }
          >
            <div className="border-b border-paper-line px-4 pt-4 pb-2">
              <MonthlyBarChart rows={data.rows} currency={currency} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="bg-black/[0.02]">
                    <th className={`${HEAD} pl-5 text-left`}>Month</th>
                    <th className={`${HEAD} text-right`}>Money in</th>
                    <th className={`${HEAD} text-right`}>Money out</th>
                    <th className={`${HEAD} text-right`}>Net</th>
                    <th className={`${HEAD} pr-5 text-right text-stamp`}>Closing balance</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr key={row.month} className="border-b border-paper-line">
                      <td className="py-2.5 pr-3 pl-5 font-medium">{monthLabel(row.month)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{formatAmount(row.moneyIn)}</td>
                      <td className="tabular px-3 py-2.5 text-right">{formatAmount(row.moneyOut)}</td>
                      <td className={`tabular px-3 py-2.5 text-right ${row.net > 0 ? 'text-green' : row.net < 0 ? 'text-rust' : ''}`}>
                        {signed(row.net)}
                      </td>
                      <td className="tabular bg-stamp-soft py-2.5 pr-5 pl-3 text-right">{formatAmount(row.closingBalance)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="py-2.5 pr-3 pl-5 font-bold">Total</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{formatAmount(data.totals.moneyIn)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{formatAmount(data.totals.moneyOut)}</td>
                    <td className="tabular px-3 py-2.5 text-right font-medium">{signed(data.totals.net)}</td>
                    <td className="bg-stamp-soft" />
                  </tr>
                </tbody>
              </table>
            </div>
          </Panel>

          <div
            className={`flex items-start gap-3 rounded-ledger border px-4 py-3.5 text-[13.5px] ${
              allCounted ? 'border-green/40 bg-green-soft' : 'border-brass/40 bg-brass-soft'
            }`}
            role="status"
          >
            <span
              aria-hidden="true"
              className={`flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[13px] font-bold text-white ${
                allCounted ? 'bg-green' : 'bg-brass'
              }`}
            >
              {allCounted ? '✓' : '!'}
            </span>
            <div>
              {allCounted ? (
                <>
                  Entries outside these months: <span className="tabular">{formatAmount(0)}</span>
                </>
              ) : (
                <>
                  Entries outside these months: in <span className="tabular">{formatAmount(outside?.moneyIn ?? 0)}</span>, out{' '}
                  <span className="tabular">{formatAmount(outside?.moneyOut ?? 0)}</span>. Change the start month or the number of
                  months to include them.
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
