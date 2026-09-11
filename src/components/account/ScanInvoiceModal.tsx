import { useRef, useState } from 'react'
import { useScanInvoice, type InvoiceScanResult } from '../../lib/invoice-scan'
import { ApiError } from '../../lib/api-client'
import { Button } from '../Button'

export function ScanInvoiceModal({
  businessId,
  accountId,
  onScanned,
  onClose,
}: {
  businessId: string
  accountId: string
  // Hands back the uploaded File itself alongside the extracted fields —
  // the account page holds onto it and attaches it to the entry once the
  // user actually saves, so they can reopen it later.
  onScanned: (result: InvoiceScanResult, file: File) => void
  onClose: () => void
}) {
  const scanInvoice = useScanInvoice(businessId, accountId)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)
    try {
      const result = await scanInvoice.mutateAsync(file)
      onScanned(result, file)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not scan that file. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-white p-7 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-2 font-display text-xl font-bold">Upload invoice</h2>
        <p className="mb-5 text-sm text-ink-soft">
          Upload an invoice PDF, or a photo of one (JPG, PNG, WEBP) — we'll read who it's from/to, the amount, and
          the date so you can confirm the rest.
        </p>

        {scanInvoice.isPending ? (
          <p className="rounded-ledger border border-dashed border-paper-line px-4 py-6 text-center text-sm text-ink-soft">
            Reading{fileName ? ` "${fileName}"` : ''}…
          </p>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-ledger border border-dashed border-paper-line px-4 py-6 text-center text-sm text-ink-soft transition-colors hover:border-stamp hover:text-stamp"
          >
            Click to choose a PDF or photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && <p className="mt-3 text-sm text-rust">{error}</p>}

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
