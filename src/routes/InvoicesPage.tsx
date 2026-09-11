import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useClients } from '../lib/clients'
import { useInvoices } from '../lib/invoices'
import { useViewMode } from '../lib/view-mode'
import type { Invoice, InvoiceStatus } from '../types/api'
import { formatMoney, formatShortDate } from '../lib/format'
import { Button } from '../components/Button'
import { ClientManager } from '../components/invoicing/ClientManager'
import { ViewToggle } from '../components/ViewToggle'
import { IconReceipt } from '../components/icons'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'border-green text-green',
  SENT: 'border-brass text-brass',
  OVERDUE: 'border-rust text-rust',
  DRAFT: 'border-dashed border-ink-soft text-ink-soft',
  CANCELLED: 'border-ink-soft text-ink-soft line-through',
}

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  PAID: 'Paid',
  SENT: 'Pending',
  OVERDUE: 'Overdue',
  DRAFT: 'Draft',
  CANCELLED: 'Cancelled',
}

function InvoiceGrid({ invoices, businessId, currency }: { invoices: Invoice[]; businessId: string; currency: string }) {
  const navigate = useNavigate()
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {invoices.map((invoice) => (
        <div
          key={invoice.id}
          role="button"
          tabIndex={0}
          onClick={() => navigate(`/businesses/${businessId}/invoices/${invoice.id}`)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') navigate(`/businesses/${businessId}/invoices/${invoice.id}`)
          }}
          className="flex cursor-pointer flex-col gap-3 rounded-ledger border border-paper-line bg-white p-4 text-left transition-colors hover:border-stamp"
        >
          <div className="flex items-start justify-between gap-2">
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[8px] bg-stamp-soft text-stamp">
              <IconReceipt width={18} height={18} />
            </span>
            <span
              className={`inline-block rounded-[4px] border px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase ${STATUS_STYLES[invoice.status]}`}
            >
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
          <div>
            <div className="truncate text-[15px] font-semibold">{invoice.client.name}</div>
            <div className="text-[12.5px] text-ink-soft">
              INV-{invoice.number} · {formatShortDate(invoice.issueDate)}
            </div>
          </div>
          <div className="tabular text-[16px] font-bold">{formatMoney(invoice.total, currency)}</div>
        </div>
      ))}
    </div>
  )
}

function InvoiceTable({ invoices, businessId, currency }: { invoices: Invoice[]; businessId: string; currency: string }) {
  return (
    <div className="overflow-x-auto rounded-ledger border border-paper-line bg-white">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr className="bg-black/[0.02]">
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Client
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-left text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Issued
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Total
            </th>
            <th className="border-b border-paper-line px-5 py-3 text-right text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase">
              Status
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => (
            <tr key={invoice.id} className="border-b border-paper-line transition-colors last:border-b-0 hover:bg-black/[0.02]">
              <td className="px-5 py-3.5 align-middle">
                <Link
                  to={`/businesses/${businessId}/invoices/${invoice.id}`}
                  className="font-medium hover:text-stamp"
                >
                  {invoice.client.name}
                </Link>
                <div className="text-[12.5px] text-ink-soft">INV-{invoice.number}</div>
              </td>
              <td className="px-5 py-3.5 align-middle text-[13.5px] text-ink-soft whitespace-nowrap">
                {formatShortDate(invoice.issueDate)}
              </td>
              <td className="tabular px-5 py-3.5 text-right align-middle font-medium">
                {formatMoney(invoice.total, currency)}
              </td>
              <td className="px-5 py-3.5 text-right align-middle">
                <span
                  className={`inline-block rounded-[4px] border px-2 py-0.5 text-[11.5px] font-semibold tracking-wide uppercase ${STATUS_STYLES[invoice.status]}`}
                >
                  {STATUS_LABELS[invoice.status]}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function InvoicesPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: invoices, isLoading } = useInvoices(businessId)
  const { data: clients } = useClients(businessId)
  const [viewMode, setViewMode] = useViewMode('invoices')

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          {invoices && invoices.length > 0 && <ViewToggle mode={viewMode} onChange={setViewMode} />}
          <Link to={`/businesses/${businessId}/invoices/new`}>
            <Button>+ New invoice</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
        <div>
          {isLoading ? (
            <p className="text-sm text-ink-soft">Loading…</p>
          ) : !invoices || invoices.length === 0 ? (
            <p className="rounded-ledger border border-dashed border-paper-line bg-white px-5 py-8 text-center text-sm text-ink-soft">
              No invoices yet — create one to send your first bill.
            </p>
          ) : viewMode === 'grid' ? (
            <InvoiceGrid invoices={invoices} businessId={businessId} currency={currency} />
          ) : (
            <InvoiceTable invoices={invoices} businessId={businessId} currency={currency} />
          )}
        </div>

        <ClientManager businessId={businessId} clients={clients ?? []} />
      </div>
    </>
  )
}
