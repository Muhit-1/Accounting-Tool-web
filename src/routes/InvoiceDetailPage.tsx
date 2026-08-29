import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useDeleteInvoice, useInvoice, useUpdateInvoiceStatus, downloadInvoicePdf } from '../lib/invoices'
import { ApiError } from '../lib/api-client'
import { formatMoney, formatShortDate } from '../lib/format'
import type { InvoiceStatus } from '../types/api'
import { Button } from '../components/Button'
import { Select } from '../components/Select'
import { Panel } from '../components/Panel'
import { ConfirmDialog } from '../components/ConfirmDialog'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-soft text-green',
  SENT: 'bg-brass-soft text-brass',
  OVERDUE: 'bg-rust-soft text-rust',
  DRAFT: 'border border-dashed border-ink-soft text-ink-soft',
  CANCELLED: 'bg-black/5 text-ink-soft line-through',
}

const STATUS_OPTIONS: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']

export function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>()
  const navigate = useNavigate()
  const { data: business } = useBusiness(businessId)
  const { data: invoice, isLoading } = useInvoice(businessId, invoiceId)
  const updateStatus = useUpdateInvoiceStatus(businessId ?? '')
  const deleteInvoice = useDeleteInvoice(businessId ?? '')

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!businessId || !invoiceId) return null
  const currency = business?.currency ?? 'BDT'

  async function handleDownload() {
    if (!invoice) return
    setDownloadError(null)
    setIsDownloading(true)
    try {
      await downloadInvoicePdf(businessId!, invoiceId!, `invoice-${invoice.number}.pdf`)
    } catch (err) {
      setDownloadError(err instanceof ApiError ? err.message : 'Could not download the PDF.')
    } finally {
      setIsDownloading(false)
    }
  }

  async function handleDelete() {
    await deleteInvoice.mutateAsync(invoiceId!)
    navigate(`/businesses/${businessId}/invoices`)
  }

  if (isLoading || !invoice) {
    return <p className="text-sm text-ink-soft">Loading…</p>
  }

  return (
    <>
      <Link to={`/businesses/${businessId}/invoices`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to invoices
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name}</p>
          <h1 className="font-display text-[28px] font-medium tracking-tight">INV-{invoice.number}</h1>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium ${STATUS_STYLES[invoice.status]}`}>
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Invoice">
          <div className="grid grid-cols-2 gap-4 border-b border-paper-line px-5 py-4 text-[14px]">
            <div>
              <div className="mb-1 text-xs tracking-wider text-ink-soft uppercase">Bill to</div>
              <div className="font-medium">{invoice.client.name}</div>
              <div className="whitespace-pre-line text-ink-soft">{invoice.client.address}</div>
            </div>
            <div className="text-right">
              <div className="mb-1">
                <span className="text-ink-soft">Issue date: </span>
                {formatShortDate(invoice.issueDate)}
              </div>
              <div className="mb-1">
                <span className="text-ink-soft">Terms: </span>
                {invoice.terms}
              </div>
              <div>
                <span className="text-ink-soft">Due date: </span>
                {formatShortDate(invoice.dueDate)}
              </div>
            </div>
          </div>

          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="border-b border-paper-line px-5 py-2.5 text-left text-[11.5px] tracking-wider text-ink-soft uppercase">
                  Description
                </th>
                <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
                  Qty
                </th>
                <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
                  Rate
                </th>
                <th className="border-b border-paper-line px-5 py-2.5 text-right text-[11.5px] tracking-wider text-ink-soft uppercase">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items?.map((item) => (
                <tr key={item.id} className="border-b border-paper-edge last:border-b-0">
                  <td className="px-5 py-3 align-middle">{item.description}</td>
                  <td className="tabular px-5 py-3 text-right align-middle">{item.quantity}</td>
                  <td className="tabular px-5 py-3 text-right align-middle">{formatMoney(item.rate, currency)}</td>
                  <td className="tabular px-5 py-3 text-right align-middle font-medium">
                    {formatMoney(item.amount, currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col items-end gap-1 px-5 py-4 text-[14px]">
            <div className="flex w-48 justify-between">
              <span className="text-ink-soft">Sub total</span>
              <span className="tabular">{formatMoney(invoice.subTotal, currency)}</span>
            </div>
            <div className="flex w-48 justify-between font-semibold">
              <span>Total</span>
              <span className="tabular">{formatMoney(invoice.total, currency)}</span>
            </div>
          </div>
        </Panel>

        <div className="flex flex-col gap-5">
          <Panel title="Actions">
            <div className="flex flex-col gap-4 px-5 py-4">
              <Select
                label="Status"
                value={invoice.status}
                onChange={(event) => updateStatus.mutate({ id: invoiceId!, status: event.target.value as InvoiceStatus })}
              >
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>

              <Button variant="ghost" onClick={handleDownload} disabled={isDownloading}>
                {isDownloading ? 'Downloading…' : 'Download PDF'}
              </Button>
              {downloadError && <p className="text-sm text-rust">{downloadError}</p>}

              <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                Delete invoice
              </Button>
            </div>
          </Panel>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this invoice?"
          body="Its PDF will also be removed. This cannot be undone."
          isPending={deleteInvoice.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </>
  )
}
