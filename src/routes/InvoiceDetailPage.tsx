import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useDeleteInvoice, useInvoice, useInvoicePdfPreview, useUpdateInvoiceStatus, downloadInvoicePdf } from '../lib/invoices'
import { ApiError } from '../lib/api-client'
import type { InvoiceStatus } from '../types/api'
import { Button } from '../components/Button'
import { Select } from '../components/Select'
import { Panel } from '../components/Panel'
import { ConfirmDialog } from '../components/ConfirmDialog'

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'border-green text-green',
  SENT: 'border-brass text-brass',
  OVERDUE: 'border-rust text-rust',
  DRAFT: 'border-dashed border-ink-soft text-ink-soft',
  CANCELLED: 'border-ink-soft text-ink-soft line-through',
}

const STATUS_OPTIONS: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']

export function InvoiceDetailPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId: string }>()
  const navigate = useNavigate()
  const { data: business } = useBusiness(businessId)
  const { data: invoice, isLoading } = useInvoice(businessId, invoiceId)
  const { url: previewUrl, isLoading: isPreviewLoading, error: previewError } = useInvoicePdfPreview(businessId, invoiceId)
  const updateStatus = useUpdateInvoiceStatus(businessId ?? '')
  const deleteInvoice = useDeleteInvoice(businessId ?? '')

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  if (!businessId || !invoiceId) return null

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
          <h1 className="font-display text-[28px] font-bold tracking-tight">INV-{invoice.number}</h1>
        </div>
        <span
          className={`inline-block rounded-[4px] border px-3 py-1.5 text-[12.5px] font-semibold tracking-wide uppercase ${STATUS_STYLES[invoice.status]}`}
        >
          {invoice.status}
        </span>
      </div>

      <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[1.7fr_1fr]">
        <Panel title="Preview">
          <div className="bg-black/[0.03] p-4">
            {isPreviewLoading ? (
              <div className="flex h-[720px] items-center justify-center text-sm text-ink-soft">
                Rendering preview…
              </div>
            ) : previewError ? (
              <div className="flex h-[720px] items-center justify-center px-6 text-center text-sm text-rust">
                {previewError}
              </div>
            ) : (
              <iframe
                src={previewUrl ?? undefined}
                title={`Invoice INV-${invoice.number} preview`}
                className="h-[720px] w-full rounded-[6px] border border-paper-line bg-white"
              />
            )}
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

              <Link to={`/businesses/${businessId}/invoices/${invoiceId}/edit`}>
                <Button variant="ghost" className="w-full">
                  Edit invoice
                </Button>
              </Link>

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
