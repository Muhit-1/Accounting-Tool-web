import type { InvoiceWithBusiness } from '../../lib/invoices'
import type { InvoiceStatus } from '../../types/api'
import { Panel } from '../Panel'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-soft text-green',
  SENT: 'bg-brass-soft text-brass',
  OVERDUE: 'bg-rust-soft text-rust',
  DRAFT: 'border border-dashed border-ink-soft text-ink-soft',
  CANCELLED: 'bg-black/5 text-ink-soft line-through',
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
  isLoading,
}: {
  invoices: InvoiceWithBusiness[]
  showBusiness: boolean
  isLoading: boolean
}) {
  const recent = invoices.slice(0, 5)

  return (
    <Panel title="Invoices">
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : recent.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">No invoices yet.</p>
      ) : (
        recent.map((invoice) => (
          <div
            key={invoice.id}
            className="flex items-center justify-between border-b border-paper-edge px-5 py-3 transition-colors last:border-b-0 hover:bg-black/[0.02]"
          >
            <div>
              <div className="text-[15px] font-medium">{invoice.client.name}</div>
              <div className="text-[13.5px] text-ink-soft">
                {showBusiness ? `${invoice.businessName} · ` : ''}INV-{invoice.number}
              </div>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium ${STATUS_STYLES[invoice.status]}`}>
              {STATUS_LABELS[invoice.status]}
            </span>
          </div>
        ))
      )}
    </Panel>
  )
}
