import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useClients } from '../lib/clients'
import { useInvoices } from '../lib/invoices'
import type { InvoiceStatus } from '../types/api'
import { formatMoney, formatShortDate } from '../lib/format'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ClientManager } from '../components/invoicing/ClientManager'

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

export function InvoicesPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data: invoices, isLoading } = useInvoices(businessId)
  const { data: clients } = useClients(businessId)

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
          <h1 className="font-display text-[28px] font-medium tracking-tight">Invoices</h1>
        </div>
        <Link to={`/businesses/${businessId}/invoices/new`}>
          <Button>+ New invoice</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="All invoices" margined>
          {isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-soft">Loading…</p>
          ) : !invoices || invoices.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-soft">
              No invoices yet — create one to send your first bill.
            </p>
          ) : (
            <div className="overflow-x-auto">
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
          )}
        </Panel>

        <ClientManager businessId={businessId} clients={clients ?? []} />
      </div>
    </>
  )
}
