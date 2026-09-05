import { useRef, useState } from 'react'
import { useScanInvoice, type InvoiceScanResult } from '../../lib/invoice-scan'
import { ApiError } from '../../lib/api-client'
import { Button } from '../Button'

export function ScanInvoiceModal({
  businessId,
  ledgerId,
  onScanned,
  onClose,
}: {
  businessId: string
  ledgerId: string
  onScanned: (result: InvoiceScanResult) => void
  onClose: () => void
}) {
  const scanInvoice = useScanInvoice(businessId, ledgerId)
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
      onScanned(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not scan that file. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-paper p-7 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-2 font-display text-xl font-semibold">Scan invoice</h2>
        <p className="mb-5 text-sm text-ink-soft">
          Upload a photo of an invoice or receipt (JPG, PNG, or WEBP) — we'll read the amount and date so you can
          confirm the rest.
        </p>

        {scanInvoice.isPending ? (
          <p className="rounded-ledger border border-dashed border-paper-line px-4 py-6 text-center text-sm text-ink-soft">
            Scanning{fileName ? ` "${fileName}"` : ''}…
          </p>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-ledger border border-dashed border-paper-line px-4 py-6 text-center text-sm text-ink-soft transition-colors hover:border-stamp hover:text-stamp"
          >
            Click to choose a photo
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
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
