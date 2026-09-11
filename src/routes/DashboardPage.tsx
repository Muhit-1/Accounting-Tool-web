import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useBusiness, useBusinesses } from '../lib/businesses'
import { useBusinessDashboard, useCombinedDashboard } from '../lib/dashboard'
import { useRecentTransactionsAcross, useTransactions, type TransactionWithBusiness } from '../lib/transactions'
import { useInvoicesAcross, useInvoices, type InvoiceWithBusiness } from '../lib/invoices'
import { useAccessGrantsAcross, useAccessGrants, type AccessGrantWithBusiness } from '../lib/access-grants'
import { useAccounts } from '../lib/accounts'
import { formatMoney } from '../lib/format'
import { monthlyCashFlow, monthOverMonthDelta } from '../lib/cashflow'
import { KpiBand, type KpiCell } from '../components/dashboard/KpiBand'
import { RecentEntriesPanel } from '../components/dashboard/RecentEntriesPanel'
import { InvoicesPanel } from '../components/dashboard/InvoicesPanel'
import { SharedAccessPanel } from '../components/dashboard/SharedAccessPanel'
import { AccountsSummaryPanel } from '../components/dashboard/AccountsSummaryPanel'
import { CashFlowChart } from '../components/dashboard/CashFlowChart'
import { InvoiceStatusDonut, type InvoiceStatusSlice } from '../components/dashboard/InvoiceStatusDonut'
import { Panel } from '../components/Panel'
import type { InvoiceStatus } from '../types/api'

function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function openInvoicesSummary(invoices: { status: string; total: number; currency: string }[]) {
  const open = invoices.filter((inv) => inv.status !== 'PAID' && inv.status !== 'CANCELLED')
  const currency = open[0]?.currency ?? invoices[0]?.currency ?? 'BDT'
  const outstanding = open.reduce((sum, inv) => sum + inv.total, 0)
  return { count: open.length, outstanding, currency }
}

const STATUS_SLICE_ORDER: { status: InvoiceStatus; label: string; colorVar: string }[] = [
  { status: 'DRAFT', label: 'Draft', colorVar: 'var(--color-ink-soft)' },
  { status: 'SENT', label: 'Sent', colorVar: 'var(--color-brass)' },
  { status: 'PAID', label: 'Paid', colorVar: 'var(--color-green)' },
  { status: 'OVERDUE', label: 'Overdue', colorVar: 'var(--color-rust)' },
]

function invoicesThisMonth(invoices: { status: InvoiceStatus; issueDate: string }[]): InvoiceStatusSlice[] {
  const now = new Date()
  const thisMonth = invoices.filter((inv) => {
    const d = new Date(inv.issueDate)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })
  return STATUS_SLICE_ORDER.map(({ status, label, colorVar }) => ({
    label,
    colorVar,
    count: thisMonth.filter((inv) => inv.status === status).length,
  }))
}

interface DashboardBody {
  heading: string
  kpiCells: KpiCell[]
  cashFlow: ReturnType<typeof monthlyCashFlow>
  invoiceStatusSlices: InvoiceStatusSlice[]
  transactions: TransactionWithBusiness[]
  invoices: InvoiceWithBusiness[]
  grants: AccessGrantWithBusiness[]
  showBusiness: boolean
  businessId?: string
  isOwner: boolean
  isLoading: boolean
  accountsPanel?: ReactNode
  emptyNote?: { title: string; body: string }
}

function DashboardBody({
  heading,
  kpiCells,
  cashFlow,
  invoiceStatusSlices,
  transactions,
  invoices,
  grants,
  showBusiness,
  businessId,
  isOwner,
  isLoading,
  accountsPanel,
  emptyNote,
}: DashboardBody) {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">
            {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}
          </p>
          <h1 className="text-pretty font-display text-[31px] font-bold tracking-tight">{heading}</h1>
        </div>
        <Link
          to={businessId ? `/businesses/${businessId}/reports` : '/reports'}
          className="border-b border-current text-[13px] text-stamp no-underline"
        >
          View reports
        </Link>
      </div>

      <KpiBand cells={kpiCells} />

      <div className="rise rise-2 mb-7">
        <Panel title="Cash flow — last 6 months">
          <div className="px-5 py-5">
            <CashFlowChart data={cashFlow} />
          </div>
        </Panel>
      </div>

      <div className="rise rise-3 grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
        <RecentEntriesPanel
          transactions={transactions}
          showBusiness={showBusiness}
          businessId={businessId}
          isLoading={isLoading}
        />

        <div className="flex flex-col gap-5">
          {accountsPanel}

          <Panel title="Invoices this month">
            <div className="px-5 py-5">
              <InvoiceStatusDonut slices={invoiceStatusSlices} />
            </div>
          </Panel>

          <InvoicesPanel
            invoices={invoices}
            showBusiness={showBusiness}
            businessId={businessId}
            isLoading={isLoading}
          />
          <SharedAccessPanel
            grants={grants}
            showBusiness={showBusiness}
            businessId={isOwner ? businessId : undefined}
            isLoading={isLoading}
          />

          {emptyNote && (
            <div className="mt-1 flex items-start gap-3 rounded-ledger border border-dashed border-stamp bg-stamp-soft px-4 py-3.5 text-[13.5px] text-ink">
              <div>
                <b className="mb-0.5 block font-display text-[15px] text-stamp">{emptyNote.title}</b>
                {emptyNote.body}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

function CombinedDashboard() {
  const { data: businesses } = useBusinesses()
  const list = businesses ?? []
  const { data: combined, isLoading: isCombinedLoading } = useCombinedDashboard()
  const { data: transactions, isLoading: isTxLoading } = useRecentTransactionsAcross(list)
  const { data: invoices, isLoading: isInvLoading } = useInvoicesAcross(list)
  const { data: grants, isLoading: isGrantLoading } = useAccessGrantsAcross(list)

  const primaryCurrency = combined?.businesses[0]?.currency ?? 'BDT'
  const { count, outstanding, currency: openCurrency } = openInvoicesSummary(invoices)
  const cashFlow = monthlyCashFlow(transactions)
  const delta = monthOverMonthDelta(cashFlow)

  const kpiCells: KpiCell[] = [
    {
      label: 'Combined balance',
      value: formatMoney(combined?.combined.balance ?? 0, primaryCurrency),
      sub: delta?.label,
      tone: delta?.tone,
    },
    { label: 'Total income', value: formatMoney(combined?.combined.totalIncome ?? 0, primaryCurrency) },
    { label: 'Total expense', value: formatMoney(combined?.combined.totalExpense ?? 0, primaryCurrency) },
    {
      label: 'Open invoices',
      value: String(count),
      sub: count > 0 ? `${formatMoney(outstanding, openCurrency)} outstanding` : undefined,
    },
  ]

  return (
    <DashboardBody
      heading={`${greeting()} — here's where things stand`}
      kpiCells={kpiCells}
      cashFlow={cashFlow}
      invoiceStatusSlices={invoicesThisMonth(invoices)}
      transactions={transactions}
      invoices={invoices}
      grants={grants}
      showBusiness
      isOwner
      isLoading={isCombinedLoading || isTxLoading || isInvLoading || isGrantLoading}
    />
  )
}

function SingleBusinessDashboard({ businessId }: { businessId: string }) {
  const { user } = useAuth()
  const { data: business } = useBusiness(businessId)
  const isOwner = business ? business.ownerId === user?.id : false
  const { data: dashboard, isLoading: isDashLoading } = useBusinessDashboard(businessId)
  const { data: rawTransactions, isLoading: isTxLoading } = useTransactions(businessId)
  const { data: rawInvoices, isLoading: isInvLoading } = useInvoices(businessId)
  const { data: rawGrants, isLoading: isGrantLoading } = useAccessGrants(businessId)
  const { data: accounts, isLoading: isAccountsLoading } = useAccounts(businessId)

  const currency = business?.currency ?? 'BDT'
  const businessName = business?.name ?? ''

  const transactions: TransactionWithBusiness[] = (rawTransactions ?? [])
    .slice()
    .reverse()
    .map((tx) => ({ ...tx, businessId, businessName, currency }))
  const invoices: InvoiceWithBusiness[] = (rawInvoices ?? []).map((inv) => ({ ...inv, businessName, currency }))
  const grants: AccessGrantWithBusiness[] = (rawGrants ?? []).map((g) => ({ ...g, businessName }))

  const { count, outstanding } = openInvoicesSummary(invoices)
  const hasActivity = (dashboard?.totalIncome ?? 0) > 0 || (dashboard?.totalExpense ?? 0) > 0
  const cashFlow = monthlyCashFlow(rawTransactions ?? [])
  const delta = monthOverMonthDelta(cashFlow)

  const kpiCells: KpiCell[] = [
    { label: 'Balance', value: formatMoney(dashboard?.balance ?? 0, currency), sub: delta?.label, tone: delta?.tone },
    { label: 'Total income', value: formatMoney(dashboard?.totalIncome ?? 0, currency) },
    { label: 'Total expense', value: formatMoney(dashboard?.totalExpense ?? 0, currency) },
    {
      label: 'Open invoices',
      value: String(count),
      sub: count > 0 ? `${formatMoney(outstanding, currency)} outstanding` : undefined,
    },
  ]

  return (
    <DashboardBody
      heading={`${greeting()} — ${businessName || 'this business'}`}
      kpiCells={kpiCells}
      cashFlow={cashFlow}
      invoiceStatusSlices={invoicesThisMonth(invoices)}
      transactions={transactions}
      invoices={invoices}
      grants={grants}
      showBusiness={false}
      businessId={businessId}
      isOwner={isOwner}
      isLoading={isDashLoading || isTxLoading || isInvLoading || isGrantLoading}
      accountsPanel={
        <AccountsSummaryPanel
          businessId={businessId}
          accounts={accounts ?? []}
          currency={currency}
          isLoading={isAccountsLoading}
        />
      }
      emptyNote={
        !isDashLoading && !hasActivity
          ? {
              title: businessName || 'New venture',
              body: "No entries yet — it'll appear on the books the day its first transaction is recorded.",
            }
          : undefined
      }
    />
  )
}

export function DashboardPage() {
  const { businessId } = useParams<{ businessId?: string }>()
  if (businessId) {
    return <SingleBusinessDashboard businessId={businessId} />
  }
  return <CombinedDashboard />
}
