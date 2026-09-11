import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useAccounts } from '../lib/accounts'
import {
  downloadReportCsv,
  downloadReportPdf,
  useCombinedReport,
  useReport,
  type CombinedReportTransaction,
  type ReportCategoryRow,
  type ReportTransaction,
} from '../lib/reports'
import { formatMoney } from '../lib/format'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { TextField } from '../components/TextField'
import { KpiBand, type KpiCell } from '../components/dashboard/KpiBand'
import { CategoryBreakdownPanel } from '../components/account/CategoryBreakdownPanel'

type Preset = 'this-month' | 'last-month' | 'last-3-months' | 'last-6-months' | 'this-year' | 'last-year' | 'all-time' | 'custom'

const PRESET_LABELS: Record<Preset, string> = {
  'this-month': 'This month',
  'last-month': 'Last month',
  'last-3-months': 'Last 3 months',
  'last-6-months': 'Last 6 months',
  'this-year': 'This year',
  'last-year': 'Last year',
  'all-time': 'All time',
  custom: 'Custom range',
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function toDateString(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month, day))
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
}

function computePresetRange(preset: Preset): { from: string; to: string } {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const today = toDateString(year, month, now.getUTCDate())

  switch (preset) {
    case 'this-month':
      return { from: toDateString(year, month, 1), to: today }
    case 'last-month':
      return { from: toDateString(year, month - 1, 1), to: toDateString(year, month, 0) }
    case 'last-3-months':
      return { from: toDateString(year, month - 2, 1), to: today }
    case 'last-6-months':
      return { from: toDateString(year, month - 5, 1), to: today }
    case 'this-year':
      return { from: `${year}-01-01`, to: today }
    case 'last-year':
      return { from: `${year - 1}-01-01`, to: `${year - 1}-12-31` }
    case 'all-time':
      return { from: '2000-01-01', to: today }
    default:
      return { from: today, to: today }
  }
}

function formatPeriodDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}

function useDateRange() {
  const [preset, setPreset] = useState<Preset>('this-month')
  const [customFrom, setCustomFrom] = useState(() => computePresetRange('this-month').from)
  const [customTo, setCustomTo] = useState(() => computePresetRange('this-month').to)

  const range = preset === 'custom' ? { from: customFrom, to: customTo } : computePresetRange(preset)

  function handlePresetChange(next: Preset) {
    if (next === 'custom') {
      setCustomFrom(range.from)
      setCustomTo(range.to)
    }
    setPreset(next)
  }

  return { preset, setPreset: handlePresetChange, customFrom, setCustomFrom, customTo, setCustomTo, range }
}

function DateRangeControls({
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: ReturnType<typeof useDateRange>) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select label="Period" value={preset} onChange={(event) => setPreset(event.target.value as Preset)}>
        {Object.entries(PRESET_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      {preset === 'custom' && (
        <>
          <TextField label="From" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          <TextField label="To" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
        </>
      )}
    </div>
  )
}

function ReportTransactionTable({
  transactions,
  currency,
  showBusiness,
}: {
  transactions: (ReportTransaction | CombinedReportTransaction)[]
  currency: string | ((tx: ReportTransaction | CombinedReportTransaction) => string)
  showBusiness?: boolean
}) {
  if (transactions.length === 0) {
    return <p className="px-5 py-8 text-sm text-ink-soft">No entries in this period.</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse">
        <thead>
          <tr className="bg-black/[0.02]">
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Date
            </th>
            {showBusiness && (
              <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
                Business
              </th>
            )}
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
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-paper-line last:border-b-0">
              <td className="px-5 py-3.5 align-middle text-[13.5px] text-ink-soft whitespace-nowrap">
                {formatPeriodDate(tx.date)}
              </td>
              {showBusiness && (
                <td className="px-5 py-3.5 align-middle text-[13.5px] text-ink-soft">
                  {'businessName' in tx ? tx.businessName : ''}
                </td>
              )}
              <td className="px-5 py-3.5 align-middle">
                <div className="font-medium">{tx.memo || tx.categoryName || '—'}</div>
                {tx.counterparty && (
                  <div className="text-[12.5px] text-ink-soft">
                    {tx.type === 'INCOME' ? 'From ' : 'To '}
                    {tx.counterparty}
                  </div>
                )}
              </td>
              <td className="px-5 py-3.5 align-middle">
                {tx.categoryName && (
                  <span className="inline-block rounded-[4px] border border-brass px-2 py-0.5 text-[11.5px] font-semibold tracking-wide text-brass uppercase">
                    {tx.categoryName}
                  </span>
                )}
              </td>
              <td
                className={`tabular px-5 py-3.5 text-right align-middle font-medium ${tx.type === 'INCOME' ? 'text-green' : 'text-rust'}`}
              >
                {tx.type === 'INCOME' ? '+' : '–'}
                {formatMoney(tx.amount, typeof currency === 'function' ? currency(tx) : currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function splitByType(byCategory: ReportCategoryRow[]) {
  return {
    income: byCategory.filter((row) => row.type === 'INCOME'),
    expense: byCategory.filter((row) => row.type === 'EXPENSE'),
  }
}

function BusinessReportView({ businessId }: { businessId: string }) {
  const dateRange = useDateRange()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const [accountId, setAccountId] = useState('')
  const { data: report, isLoading } = useReport(businessId, { ...dateRange.range, accountId: accountId || undefined })
  const currency = business?.currency ?? 'BDT'

  const kpiCells: KpiCell[] = report
    ? [
        { label: 'Total income', value: formatMoney(report.totals.totalIncome, currency) },
        { label: 'Total expense', value: formatMoney(report.totals.totalExpense, currency) },
        { label: 'Balance', value: formatMoney(report.totals.balance, currency) },
      ]
    : []

  const { income, expense } = splitByType(report?.byCategory ?? [])

  async function handleDownloadPdf() {
    await downloadReportPdf(businessId, { ...dateRange.range, accountId: accountId || undefined }, reportFilename(business?.name, dateRange.range, 'pdf'))
  }

  function handleDownloadCsv() {
    if (!report) return
    downloadReportCsv(report.transactions, reportFilename(business?.name, dateRange.range, 'csv'))
  }

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Report</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleDownloadCsv} disabled={!report}>
            Download CSV
          </Button>
          <Button variant="ghost" onClick={handleDownloadPdf} disabled={!report}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-3">
        <DateRangeControls {...dateRange} />
        <Select label="Account" value={accountId} onChange={(event) => setAccountId(event.target.value)}>
          <option value="">All accounts</option>
          {accounts?.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading || !report ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <KpiBand cells={kpiCells} />
          <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
            <Panel title="Entries" margined>
              <ReportTransactionTable transactions={report.transactions} currency={currency} />
            </Panel>
            <div className="flex flex-col gap-5">
              <CategoryBreakdownPanel byCategory={income} currency={currency} title="Income by category" />
              <CategoryBreakdownPanel byCategory={expense} currency={currency} title="Expense by category" />
            </div>
          </div>
        </>
      )}
    </>
  )
}

function CombinedReportView() {
  const dateRange = useDateRange()
  const { data: report, isLoading } = useCombinedReport(dateRange.range)

  const kpiCells: KpiCell[] = report
    ? [
        { label: 'Combined income', value: report.combinedTotals.totalIncome.toFixed(2) },
        { label: 'Combined expense', value: report.combinedTotals.totalExpense.toFixed(2) },
        { label: 'Combined balance', value: report.combinedTotals.balance.toFixed(2) },
      ]
    : []

  async function handleDownloadPdf() {
    await downloadReportPdf(undefined, dateRange.range, reportFilename('all-businesses', dateRange.range, 'pdf'))
  }

  function handleDownloadCsv() {
    if (!report) return
    downloadReportCsv(report.transactions, reportFilename('all-businesses', dateRange.range, 'csv'))
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">All businesses</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Combined report</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleDownloadCsv} disabled={!report}>
            Download CSV
          </Button>
          <Button variant="ghost" onClick={handleDownloadPdf} disabled={!report}>
            Download PDF
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <DateRangeControls {...dateRange} />
      </div>

      {isLoading || !report ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-ink-soft">
            Totals are combined across currencies as raw numbers — each venture below shows its own currency.
          </p>
          <KpiBand cells={kpiCells} />

          <div className="mb-7 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {report.businesses.map(({ business, totals }) => (
              <div key={business.id} className="rounded-ledger border border-paper-line bg-white px-5 py-4">
                <div className="mb-2 font-display text-[15px] font-bold">{business.name}</div>
                <div className="flex justify-between text-[13.5px]">
                  <span className="text-ink-soft">Income</span>
                  <span className="tabular text-green">{formatMoney(totals.totalIncome, business.currency)}</span>
                </div>
                <div className="flex justify-between text-[13.5px]">
                  <span className="text-ink-soft">Expense</span>
                  <span className="tabular text-rust">{formatMoney(totals.totalExpense, business.currency)}</span>
                </div>
                <div className="mt-1 flex justify-between border-t border-paper-line pt-1 text-[13.5px] font-medium">
                  <span>Balance</span>
                  <span className="tabular">{formatMoney(totals.balance, business.currency)}</span>
                </div>
              </div>
            ))}
          </div>

          <Panel title="All entries" margined>
            <ReportTransactionTable
              transactions={report.transactions}
              currency={(tx) => ('currency' in tx ? tx.currency : 'BDT')}
              showBusiness
            />
          </Panel>
        </>
      )}
    </>
  )
}

function reportFilename(name: string | undefined, range: { from: string; to: string }, ext: string): string {
  const safeName = (name ?? 'report').toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return `report-${safeName}-${range.from}-to-${range.to}.${ext}`
}

export function ReportsPage() {
  const { businessId } = useParams<{ businessId?: string }>()
  if (businessId) {
    return <BusinessReportView businessId={businessId} />
  }
  return <CombinedReportView />
}
