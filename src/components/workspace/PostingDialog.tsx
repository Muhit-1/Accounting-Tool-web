import { useMemo, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { useInvoices, INVOICE_STATUS_LABEL } from '../../lib/invoices'
import { POSTABLE_INVOICE_STATUSES, previewInvoices, previewText, savedText, useSavePostingConfig } from '../../lib/posting-config'
import { useToast } from '../../lib/toast-context'
import type { InvoiceStatus, PostingConfig } from '../../types/api'
import { Button } from '../Button'
import { Modal } from '../Modal'

// What the Invoices page sends, in plain words (the server decides the rest).
const INFO: [string, string][] = [
  ['Amount', 'Total'],
  ['Date', 'Paid on (issue date until it is paid)'],
  ['Money', 'In'],
]

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

// Invoices → Cash book: On/Off and which statuses count. Saving re-syncs the linked Cash book rows
// in one go on the server.
export function PostingDialog({ businessId, tableName, config, onClose }: { businessId: string; tableName: string; config: PostingConfig; onClose: () => void }) {
  const toast = useToast()
  const save = useSavePostingConfig(businessId)
  const { data: invoices } = useInvoices(businessId)

  const [on, setOn] = useState(config.invoices.on)
  const [when, setWhen] = useState<InvoiceStatus[]>(config.invoices.when)
  const [error, setError] = useState<string | null>(null)

  const nothingChosen = on && when.length === 0
  const preview = useMemo(() => previewInvoices(invoices ?? [], when), [invoices, when])

  async function submit() {
    setError(null)
    try {
      const result = await save.mutateAsync({ invoices: { on, when } })
      toast(savedText(result))
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save. Please try again.')
    }
  }

  return (
    <Modal title={`${tableName} → Cash book`} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          if (!nothingChosen) void submit()
        }}
      >
        <label className="flex items-center gap-2.5 text-[14px] font-semibold">
          <input type="checkbox" checked={on} onChange={(event) => setOn(event.target.checked)} className="h-4 w-4 accent-stamp" />
          Send these rows to the Cash book
        </label>

        <dl className={`grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px] ${on ? '' : 'opacity-50'}`}>
          {INFO.map(([label, text]) => (
            <div key={label} className="contents">
              <dt className="text-ink-soft">{label}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>

        <fieldset disabled={!on} className={`flex flex-col gap-2 ${on ? '' : 'opacity-50'}`}>
          <legend className="mb-1 text-[13px] font-semibold">Only when Status is</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5">
            {POSTABLE_INVOICE_STATUSES.map((status) => (
              <label key={status} className="flex items-center gap-2 text-[13.5px]">
                <input type="checkbox" checked={when.includes(status)} onChange={() => setWhen((current) => toggle(current, status))} className="h-4 w-4 accent-stamp" />
                {INVOICE_STATUS_LABEL[status]}
              </label>
            ))}
          </div>
        </fieldset>

        {on && !nothingChosen && (
          <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
            {previewText(preview)}
            {preview.empty > 0 && (
              <span className="mt-1 block text-rust">
                {preview.empty} {preview.empty === 1 ? 'row has' : 'rows have'} no total to post. Fix {preview.empty === 1 ? 'it' : 'them'} first.
              </span>
            )}
          </div>
        )}
        <p className="text-[13px] text-ink-soft">
          {on ? 'Posted rows show gold and locked in the Cash book. Change the row here and it follows.' : 'Nothing from this table is added to the Cash book. Rows already posted are removed.'}
        </p>

        {nothingChosen && <p className="text-[13px] text-rust">Choose at least one status.</p>}
        {error && (
          <p role="alert" className="text-[13px] text-rust">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={save.isPending || nothingChosen}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
