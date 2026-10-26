import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../lib/api-client'
import { useBusiness } from '../lib/businesses'
import { useClients } from '../lib/clients'
import { downloadFile } from '../lib/download'
import { exportFileName, toCsv } from '../lib/export-table'
import { formatMoney, formatShortDate } from '../lib/format'
import { formatMoneyCell } from '../lib/grid-parse'
import { downloadInvoicePdf, INVOICE_STATUS_LABEL, isInvoiceDeletable, isInvoiceEditable, statusChoices, useDeleteInvoice, useInvoices, useUpdateInvoiceStatus } from '../lib/invoices'
import { filterInvoices, STATUS_ACTION, statusCounts, visibleTabs, type StatusFilter } from '../lib/invoices-list'
import { DEFAULT_POSTING_CONFIG, invoicePosts, usePostingConfig } from '../lib/posting-config'
import { useToast } from '../lib/toast-context'
import { useDeferredDelete } from '../lib/use-deferred-delete'
import type { Invoice, InvoiceStatus } from '../types/api'
import { Button } from '../components/Button'
import { FloatingMenu, type MenuEntry } from '../components/FloatingMenu'
import { ClientManager } from '../components/invoicing/ClientManager'
import { Modal } from '../components/Modal'
import { PostingDialog } from '../components/workspace/PostingDialog'
import { IconPlus, IconReceipt, IconSearch } from '../components/icons'

const EMPTY: Invoice[] = []
const rowId = (invoice: Invoice) => invoice.id
const describeDeleted = (count: number) => (count === 1 ? 'Invoice deleted.' : `${count} invoices deleted.`)

const STATUS_PILL: Record<InvoiceStatus, string> = {
  PAID: 'bg-green-soft text-green',
  SENT: 'bg-stamp-soft text-stamp',
  OVERDUE: 'bg-rust-soft text-rust',
  DRAFT: 'bg-paper-edge text-ink-soft',
  CANCELLED: 'bg-paper-edge text-ink-soft line-through',
}

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function DotsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="5" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="12" cy="19" r="1.7" />
    </svg>
  )
}

// Phones get the cards; the table needs the width.
function InvoiceCards({ invoices, businessId, currency }: { invoices: Invoice[]; businessId: string; currency: string }) {
  const navigate = useNavigate()
  return (
    <ul className="flex flex-col gap-2 md:hidden">
      {invoices.length === 0 && <li className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">No invoices to show.</li>}
      {invoices.map((invoice) => (
        <li key={invoice.id}>
          <button
            type="button"
            onClick={() => navigate(`/businesses/${businessId}/invoices/${invoice.id}`)}
            className="flex w-full items-start justify-between gap-3 rounded-ledger border border-paper-line bg-white px-4 py-3 text-left"
          >
            <span className="flex min-w-0 items-start gap-3">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[8px] bg-stamp-soft text-stamp">
                <IconReceipt width={17} height={17} />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{invoice.client.name}</span>
                <span className="block text-[12.5px] text-ink-soft">
                  INV-{invoice.number} · {formatShortDate(invoice.issueDate)}
                </span>
              </span>
            </span>
            <span className="flex-none text-right">
              <span className="tabular block">{formatMoney(invoice.total, currency)}</span>
              <span className={`inline-block rounded-full px-2 py-px text-[11px] font-semibold ${STATUS_PILL[invoice.status]}`}>{INVOICE_STATUS_LABEL[invoice.status]}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// The invoices of a business as a plain list: number, client, due date, amount, status, and a ⋮ menu for what you can do
// with one. A new invoice and an open invoice have their own pages. When the posting settings say so, sent or paid
// invoices post to the Cash book.
export function InvoicesPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: business } = useBusiness(businessId)
  const { data, isLoading, error } = useInvoices(businessId)
  const { data: clientData } = useClients(businessId)
  const { data: postingData } = usePostingConfig(businessId)
  const invoices = data ?? EMPTY
  const clients = useMemo(() => clientData ?? [], [clientData])
  const postingConfig = postingData ?? DEFAULT_POSTING_CONFIG
  const updateStatus = useUpdateInvoiceStatus(businessId ?? '')
  const deleteInvoice = useDeleteInvoice(businessId ?? '')

  const [status, setStatus] = useState<StatusFilter>('ALL')
  const [query, setQuery] = useState('')
  const [showPosting, setShowPosting] = useState(false)
  const [showClients, setShowClients] = useState(false)
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)

  const deleteRows = useCallback((rows: Invoice[]) => Promise.all(rows.map((invoice) => deleteInvoice.mutateAsync(invoice.id))), [deleteInvoice])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  const counts = useMemo(() => statusCounts(invoices.filter((i) => !hiddenIds.has(i.id))), [invoices, hiddenIds])
  const shown = useMemo(() => filterInvoices(invoices, status, query).filter((i) => !hiddenIds.has(i.id)), [invoices, status, query, hiddenIds])

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'
  const on = postingConfig.invoices.on

  async function moveTo(invoice: Invoice, next: InvoiceStatus) {
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status: next })
      const before = invoicePosts(postingConfig, invoice.status)
      const after = invoicePosts(postingConfig, next)
      if (after && !before) toast(`INV-${invoice.number} is ${INVOICE_STATUS_LABEL[next].toLowerCase()} — posted to the Cash book.`)
      else if (before && !after) toast(`INV-${invoice.number} is now ${INVOICE_STATUS_LABEL[next].toLowerCase()} — removed from the Cash book.`)
      else toast(`INV-${invoice.number} is ${INVOICE_STATUS_LABEL[next].toLowerCase()}.`)
    } catch (err) {
      toast(messageOf(err))
    }
  }

  function rowMenu(invoice: Invoice): MenuEntry[] {
    const open = `/businesses/${businessId}/invoices/${invoice.id}`
    const items: MenuEntry[] = [{ label: 'Open', onSelect: () => navigate(open) }]
    if (isInvoiceEditable(invoice.status)) items.push({ label: 'Edit', onSelect: () => navigate(`${open}/edit`) })
    items.push({
      label: 'Download PDF',
      onSelect: () => void downloadInvoicePdf(businessId!, invoice.id, `invoice-${invoice.number}.pdf`).catch((err) => toast(messageOf(err))),
    })
    const moves = statusChoices(invoice.status).slice(1)
    if (moves.length > 0) items.push('separator', ...moves.map((next) => ({ label: STATUS_ACTION[next], danger: next === 'CANCELLED', onSelect: () => void moveTo(invoice, next) })))
    if (isInvoiceDeletable(invoice.status)) items.push('separator', { label: 'Delete', danger: true, onSelect: () => schedule([invoice]) })
    return items
  }

  function exportCsv() {
    const headers = ['Invoice no.', 'Date', 'Client', 'Due', 'Amount', 'Status']
    const body = shown.map((i) => [`INV-${i.number}`, i.issueDate.slice(0, 10), i.client.name, i.dueDate.slice(0, 10), i.total, INVOICE_STATUS_LABEL[i.status]])
    downloadFile(toCsv(headers, body), exportFileName('Invoices', 'csv'), 'text/csv;charset=utf-8')
    toast(`${shown.length} ${shown.length === 1 ? 'invoice' : 'invoices'} saved.`)
  }

  const moreItems: MenuEntry[] = [
    { label: 'Posts to Cash book…', hint: on ? 'On: sent or paid invoices go to the Cash book.' : 'Off', onSelect: () => setShowPosting(true) },
    { label: 'Clients…', hint: `${clients.length} saved`, onSelect: () => setShowClients(true) },
    'separator',
    { label: 'Export this list (CSV)', onSelect: exportCsv },
  ]

  return (
    <>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Invoices</h1>
        </div>
        <Link to={`/businesses/${businessId}/invoices/new`}>
          <Button>
            <IconPlus width={15} height={15} />
            New invoice
          </Button>
        </Link>
      </div>

      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the invoices.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <label className="relative block">
              <IconSearch width={15} height={15} className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-ink-soft" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search number or client"
                aria-label="Search invoices"
                className="w-60 rounded-ledger border border-paper-line bg-white py-1.5 pr-2.5 pl-8 text-[13px] focus:border-stamp focus:outline-none"
              />
            </label>
            <div role="group" aria-label="Status" className="inline-flex overflow-hidden rounded-ledger border border-paper-line bg-white">
              {visibleTabs(counts).map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={status === tab.value}
                  onClick={() => setStatus(tab.value)}
                  className={`border-r border-paper-line px-3 py-1.5 text-[12.5px] font-semibold last:border-r-0 ${status === tab.value ? 'bg-stamp-soft text-stamp' : 'text-ink-soft hover:bg-paper'}`}
                >
                  {tab.label}
                  <span className="ml-1 font-medium opacity-70">{counts[tab.value]}</span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              type="button"
              aria-haspopup="menu"
              onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: moreItems })}
              className="inline-flex items-center gap-1.5 rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
            >
              <DotsIcon />
              More
            </button>
          </div>

          <div className="hidden overflow-hidden rounded-ledger border border-paper-line bg-white md:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-[#f8fafc] text-left text-[11px] tracking-wider text-ink-soft uppercase">
                  <th className="border-b border-paper-line px-4 py-2 font-semibold">Number</th>
                  <th className="border-b border-paper-line px-4 py-2 font-semibold">Client</th>
                  <th className="border-b border-paper-line px-4 py-2 font-semibold">Due</th>
                  <th className="border-b border-paper-line px-4 py-2 text-right font-semibold">Amount</th>
                  <th className="border-b border-paper-line px-4 py-2 font-semibold">Status</th>
                  <th className="w-12 border-b border-paper-line" />
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-ink-soft">
                      {invoices.length === 0 ? (
                        <>
                          No invoices yet.{' '}
                          <Link to={`/businesses/${businessId}/invoices/new`} className="font-semibold text-stamp underline">
                            Make the first one
                          </Link>
                          .
                        </>
                      ) : (
                        'No invoices match.'
                      )}
                    </td>
                  </tr>
                )}
                {shown.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-paper-edge last:border-b-0 hover:bg-stamp-soft/60">
                    <td className="px-4 py-2.5 font-semibold">
                      <Link to={`/businesses/${businessId}/invoices/${invoice.id}`} className="text-stamp hover:underline">
                        INV-{invoice.number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">{invoice.client.name}</td>
                    <td className="px-4 py-2.5 text-ink-soft">{formatShortDate(invoice.dueDate)}</td>
                    <td className="tabular px-4 py-2.5 text-right">{formatMoneyCell(invoice.total)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-px text-xs font-semibold ${STATUS_PILL[invoice.status]}`}>{INVOICE_STATUS_LABEL[invoice.status]}</span>
                    </td>
                    <td className="px-2 py-1">
                      <button
                        type="button"
                        aria-label={`Actions for invoice ${invoice.number}`}
                        aria-haspopup="menu"
                        onClick={(event) => setMenu({ anchor: event.currentTarget.getBoundingClientRect(), items: rowMenu(invoice) })}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-ink-soft hover:bg-stamp-soft hover:text-ink"
                      >
                        <DotsIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <InvoiceCards invoices={shown} businessId={businessId} currency={currency} />
        </>
      )}

      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
      {showPosting && <PostingDialog businessId={businessId} tableName="Invoices" config={postingConfig} onClose={() => setShowPosting(false)} />}
      {showClients && (
        <Modal title="Clients" onClose={() => setShowClients(false)} wide>
          <ClientManager businessId={businessId} clients={clients} />
        </Modal>
      )}
    </>
  )
}
