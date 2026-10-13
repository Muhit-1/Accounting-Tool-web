import { useMemo, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { useCosts } from '../../lib/costs'
import { useInvoices, INVOICE_STATUS_LABEL } from '../../lib/invoices'
import { ORDER_STATUS_LABEL, type OrderStatus } from '../../lib/order-status'
import { useOrders } from '../../lib/orders'
import {
  POSTABLE_INVOICE_STATUSES,
  POSTABLE_ORDER_STATUSES,
  previewInvoices,
  previewOrders,
  previewText,
  savedText,
  useSavePostingConfig,
  type PostingTable,
} from '../../lib/posting-config'
import { useToast } from '../../lib/toast-context'
import type { InvoiceStatus, PostingConfig } from '../../types/api'
import { Button } from '../Button'
import { Modal } from '../Modal'

// What each table sends, in plain words (the server decides the rest).
const INFO: Record<PostingTable, [string, string][]> = {
  orders: [
    ['Amount', 'Total'],
    ['Date', 'Delivered on (order date if empty)'],
    ['Money', 'In — or out when Fund treatment is “Deduct from fund”'],
  ],
  costs: [
    ['Amount', 'Total'],
    ['Date', 'Paid on'],
    ['Money', 'Out, only when paid by Business money'],
  ],
  invoices: [
    ['Amount', 'Total'],
    ['Date', 'Paid on (issue date until it is paid)'],
    ['Money', 'In'],
  ],
}

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

// "Posts to Cash book": On/Off, and for orders and invoices which statuses count.
// Saving re-syncs the linked Cash book rows in one go on the server.
export function PostingDialog({
  businessId,
  table,
  tableName,
  config,
  onClose,
}: {
  businessId: string
  table: PostingTable
  tableName: string
  config: PostingConfig
  onClose: () => void
}) {
  const toast = useToast()
  const save = useSavePostingConfig(businessId)
  const { data: orderData } = useOrders(table === 'orders' ? businessId : undefined)
  const { data: invoices } = useInvoices(table === 'invoices' ? businessId : undefined)
  const { data: costData } = useCosts(table === 'costs' ? businessId : undefined)

  const [on, setOn] = useState(config[table].on)
  const [orderWhen, setOrderWhen] = useState<OrderStatus[]>(config.orders.when)
  const [invoiceWhen, setInvoiceWhen] = useState<InvoiceStatus[]>(config.invoices.when)
  const [error, setError] = useState<string | null>(null)

  const choose = table === 'orders' ? orderWhen : table === 'invoices' ? invoiceWhen : null
  const nothingChosen = on && choose !== null && choose.length === 0

  const preview = useMemo(() => {
    if (table === 'orders') return previewOrders(orderData?.orders ?? [], orderWhen)
    if (table === 'invoices') return previewInvoices(invoices ?? [], invoiceWhen)
    return null
  }, [table, orderData, invoices, orderWhen, invoiceWhen])

  const costsFromBusiness = (costData?.costs ?? []).filter((cost) => cost.paidFrom === 'BUSINESS').length

  async function submit() {
    setError(null)
    const next: PostingConfig = {
      orders: { on: table === 'orders' ? on : config.orders.on, when: table === 'orders' ? orderWhen : config.orders.when },
      costs: { on: table === 'costs' ? on : config.costs.on },
      invoices: { on: table === 'invoices' ? on : config.invoices.on, when: table === 'invoices' ? invoiceWhen : config.invoices.when },
    }
    try {
      const result = await save.mutateAsync(next)
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
          {INFO[table].map(([label, text]) => (
            <div key={label} className="contents">
              <dt className="text-ink-soft">{label}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>

        {choose !== null && (
          <fieldset disabled={!on} className={`flex flex-col gap-2 ${on ? '' : 'opacity-50'}`}>
            <legend className="mb-1 text-[13px] font-semibold">Only when Status is</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {table === 'orders'
                ? POSTABLE_ORDER_STATUSES.map((status) => (
                    <label key={status} className="flex items-center gap-2 text-[13.5px]">
                      <input
                        type="checkbox"
                        checked={orderWhen.includes(status)}
                        onChange={() => setOrderWhen((current) => toggle(current, status))}
                        className="h-4 w-4 accent-stamp"
                      />
                      {ORDER_STATUS_LABEL[status]}
                    </label>
                  ))
                : POSTABLE_INVOICE_STATUSES.map((status) => (
                    <label key={status} className="flex items-center gap-2 text-[13.5px]">
                      <input
                        type="checkbox"
                        checked={invoiceWhen.includes(status)}
                        onChange={() => setInvoiceWhen((current) => toggle(current, status))}
                        className="h-4 w-4 accent-stamp"
                      />
                      {INVOICE_STATUS_LABEL[status]}
                    </label>
                  ))}
            </div>
            {table === 'orders' && <p className="text-xs text-ink-soft">Cancelled and Returned orders never post.</p>}
          </fieldset>
        )}

        {on && preview && !nothingChosen && (
          <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
            {previewText(preview)}
            {preview.empty > 0 && (
              <span className="mt-1 block text-rust">
                {preview.empty} {preview.empty === 1 ? 'row has' : 'rows have'} no total to post. Fix {preview.empty === 1 ? 'it' : 'them'} first.
              </span>
            )}
          </div>
        )}
        {on && table === 'costs' && (
          <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
            {costsFromBusiness} {costsFromBusiness === 1 ? 'cost is' : 'costs are'} paid by Business money.
          </div>
        )}
        <p className="text-[13px] text-ink-soft">
          {on
            ? 'Posted rows show gold and locked in the Cash book. Change the row here and it follows.'
            : 'Nothing from this table is added to the Cash book. Rows already posted are removed.'}
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
