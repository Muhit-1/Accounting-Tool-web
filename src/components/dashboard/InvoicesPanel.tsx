import { Link } from 'react-router-dom'
import type { InvoiceWithBusiness } from '../../lib/invoices'
import type { InvoiceStatus } from '../../types/api'
import { Panel } from '../Panel'

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

export function InvoicesPanel({
  invoices,
  showBusiness,
  businessId,
  isLoading,
}: {
  invoices: InvoiceWithBusiness[]
  showBusiness: boolean
  businessId?: string
  isLoading: boolean
}) {
  const recent = invoices.slice(0, 5)

  return (
    <Panel
      title="Invoices"
      action={
        businessId ? (
          <Link
            to={`/businesses/${businessId}/invoices/new`}
            className="border-b border-current text-[13px] text-stamp no-underline"
          >
            New invoice
          </Link>
        ) : undefined
      }
    >
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">No invoices yet.</p>
      ) : (
        recent.map((invoice) => (
          <Link
            key={invoice.id}
            to={`/businesses/${invoice.businessId}/invoices/${invoice.id}`}
            className="flex items-center justify-between border-b border-paper-edge px-5 py-3 transition-colors last:border-b-0 hover:bg-black/[0.02]"
          >
            <div>
              <div className="text-[15px] font-medium">{invoice.client.name}</div>
              <div className="text-[13.5px] text-ink-soft">
                {showBusiness ? `${invoice.businessName} · ` : ''}INV-{invoice.number}
              </div>
            </div>
            <span
              className={`inline-block rounded-[4px] border px-2 py-0.5 text-[11.5px] font-semibold tracking-wide uppercase ${STATUS_STYLES[invoice.status]}`}
            >
              {STATUS_LABELS[invoice.status]}
            </span>
          </Link>
        ))
      )}
    </Panel>
  )
}
