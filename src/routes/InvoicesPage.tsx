import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import { useBusiness } from '../lib/businesses'
import { useClients } from '../lib/clients'
import { formatMoney, formatShortDate } from '../lib/format'
import { formatDateCell, formatMoneyCell } from '../lib/grid-parse'
import { gridPrefsKey } from '../lib/grid-prefs'
import { INVOICE_STATUS_LABEL, statusChoices, useDeleteInvoice, useInvoices, useUpdateInvoice, useUpdateInvoiceStatus } from '../lib/invoices'
import { planInvoiceEdit, splitDeletable } from '../lib/invoices-grid'
import { DEFAULT_POSTING_CONFIG, invoicePosts, usePostingConfig } from '../lib/posting-config'
import { useToast } from '../lib/toast-context'
import { useDeferredDelete } from '../lib/use-deferred-delete'
import type { Invoice, InvoiceStatus } from '../types/api'
import { Button } from '../components/Button'
import { Grid } from '../components/grid/Grid'
import type { BulkAction, GridColumn, GridFilter } from '../components/grid/grid-types'
import { ClientManager } from '../components/invoicing/ClientManager'
import { Modal } from '../components/Modal'
import { PostingDialog } from '../components/workspace/PostingDialog'
import { PostsButton } from '../components/workspace/PostsButton'
import { IconReceipt } from '../components/icons'

const EMPTY: Invoice[] = []
const rowId = (invoice: Invoice) => invoice.id
const describeDeleted = (count: number) => (count === 1 ? 'Invoice deleted.' : `${count} invoices deleted.`)

const STATUS_STYLES: Record<InvoiceStatus, string> = {
  PAID: 'border-green text-green',
  SENT: 'border-brass text-brass',
  OVERDUE: 'border-rust text-rust',
  DRAFT: 'border-dashed border-ink-soft text-ink-soft',
  CANCELLED: 'border-ink-soft text-ink-soft line-through',
}

const STATUS_COLOR: Record<InvoiceStatus, string> = {
  PAID: 'text-green',
  SENT: 'text-brass',
  OVERDUE: 'text-rust',
  DRAFT: 'text-ink-soft',
  CANCELLED: 'text-ink-soft line-through',
}

const STATUS_CHOICES = (Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]).map((value) => ({ value, label: INVOICE_STATUS_LABEL[value] }))

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

// Phones get the cards; the sheet needs the width.
function InvoiceCards({ invoices, businessId, currency }: { invoices: Invoice[]; businessId: string; currency: string }) {
  const navigate = useNavigate()
  return (
    <ul className="flex flex-col gap-2 md:hidden">
      {invoices.length === 0 && (
        <li className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">No invoices yet.</li>
      )}
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
              <span className={`inline-block rounded-[4px] border px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide uppercase ${STATUS_STYLES[invoice.status]}`}>
                {INVOICE_STATUS_LABEL[invoice.status]}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

// The Invoices table as a sheet. The number and the amount come from the
// invoice itself; a draft can change its date and client here, and the status
// moves along the usual steps. New invoices and the full invoice open in the
// form and detail pages. When the posting settings say so, sent / paid
// invoices post to the Cash book.
export function InvoicesPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const { data: business } = useBusiness(businessId)
  const { data, isLoading, error } = useInvoices(businessId)
  const { data: clientData } = useClients(businessId)
  const { data: postingData } = usePostingConfig(businessId)
  const invoices = data ?? EMPTY
  const clients = useMemo(() => clientData ?? [], [clientData])
  const postingConfig = postingData ?? DEFAULT_POSTING_CONFIG
  const updateInvoice = useUpdateInvoice(businessId ?? '')
  const updateStatus = useUpdateInvoiceStatus(businessId ?? '')
  const deleteInvoice = useDeleteInvoice(businessId ?? '')

  const [showPosting, setShowPosting] = useState(false)
  const [showClients, setShowClients] = useState(false)

  const deleteRows = useCallback((rows: Invoice[]) => Promise.all(rows.map((invoice) => deleteInvoice.mutateAsync(invoice.id))), [deleteInvoice])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  const updateAsync = updateInvoice.mutateAsync
  const statusAsync = updateStatus.mutateAsync
  const commit = useCallback(
    async (invoice: Invoice, columnId: string, text: string): Promise<string | null> => {
      const plan = planInvoiceEdit(invoice, columnId, text, clients)
      if (plan.kind === 'noop') return null
      if (plan.kind === 'error') return plan.message
      try {
        if (plan.kind === 'status') {
          await statusAsync({ id: invoice.id, status: plan.status })
          const before = invoicePosts(postingConfig, invoice.status)
          const after = invoicePosts(postingConfig, plan.status)
          if (after && !before) toast(`INV-${invoice.number} is ${INVOICE_STATUS_LABEL[plan.status].toLowerCase()} — posted to the Cash book.`)
          else if (before && !after) toast(`INV-${invoice.number} is now ${INVOICE_STATUS_LABEL[plan.status].toLowerCase()} — removed from the Cash book.`)
        } else {
          await updateAsync({ id: invoice.id, ...plan.patch })
        }
        return null
      } catch (err) {
        return messageOf(err)
      }
    },
    [clients, statusAsync, updateAsync, toast, postingConfig],
  )

  const open = useCallback((invoice: Invoice) => navigate(`/businesses/${invoice.businessId}/invoices/${invoice.id}`), [navigate])

  const columns = useMemo<GridColumn<Invoice>[]>(
    () => [
      {
        id: 'n',
        label: 'Invoice no.',
        type: 'calc',
        width: '120px',
        required: true,
        locked: true,
        value: (i) => i.number,
        text: (i) => `INV-${i.number}`,
        onActivate: open,
      },
      {
        id: 'date',
        label: 'Date',
        type: 'date',
        width: '124px',
        required: true,
        value: (i) => i.issueDate.slice(0, 10),
        text: (i) => formatDateCell(i.issueDate),
        readOnly: (i) => i.status !== 'DRAFT',
      },
      {
        id: 'client',
        label: 'Client',
        type: 'choice',
        width: 'minmax(220px,1fr)',
        required: true,
        value: (i) => i.clientId,
        text: (i) => i.client.name,
        choices: () => clients.map((client) => ({ value: client.id, label: client.name })),
        readOnly: (i) => i.status !== 'DRAFT',
      },
      {
        id: 'amount',
        label: 'Amount',
        type: 'calc',
        width: '136px',
        required: true,
        locked: true,
        sum: true,
        value: (i) => i.total,
        text: (i) => formatMoneyCell(i.total),
      },
      {
        id: 'status',
        label: 'Status',
        type: 'choice',
        width: '132px',
        required: true,
        value: (i) => i.status,
        text: (i) => INVOICE_STATUS_LABEL[i.status],
        choices: (row) => (row ? statusChoices(row.status) : STATUS_CHOICES.map((choice) => choice.value)).map((status) => ({ value: status, label: INVOICE_STATUS_LABEL[status] })),
        choiceClass: (value) => `font-semibold ${STATUS_COLOR[value as InvoiceStatus] ?? ''}`,
      },
    ],
    [clients, open],
  )

  const filter = useMemo<GridFilter<Invoice>>(() => ({ label: 'All statuses', choices: STATUS_CHOICES, match: (invoice, value) => invoice.status === value }), [])

  const bulkActions = useMemo<BulkAction<Invoice>[]>(
    () => [
      {
        id: 'status',
        label: 'Set status',
        choices: STATUS_CHOICES,
        run: async (rows, status) => {
          let changed = 0
          let skipped = 0
          for (const invoice of rows) {
            const problem = await commit(invoice, 'status', status)
            if (problem) skipped += 1
            else if (invoice.status !== status) changed += 1
          }
          toast(`${changed} ${changed === 1 ? 'invoice' : 'invoices'} updated${skipped ? `, ${skipped} skipped (that move is not allowed)` : ''}.`)
        },
      },
    ],
    [commit, toast],
  )

  const deleteSelected = useCallback(
    (rows: Invoice[]) => {
      const { deletable, kept } = splitDeletable(rows)
      if (kept > 0) toast('Only a draft or cancelled invoice can be deleted.')
      schedule(deletable)
    },
    [schedule, toast],
  )

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'
  const on = postingConfig.invoices.on

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Invoices</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setShowClients(true)}>
            Clients
          </Button>
          <Link to={`/businesses/${businessId}/invoices/new`}>
            <Button>+ New invoice</Button>
          </Link>
        </div>
      </div>

      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the invoices.
        </p>
      ) : isLoading ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Grid<Invoice>
              prefsKey={gridPrefsKey(user?.id ?? 'anonymous', businessId, 'invoices')}
              columns={columns}
              rows={invoices}
              rowId={rowId}
              onCommit={commit}
              onDeleteRows={deleteSelected}
              bulkActions={bulkActions}
              filter={filter}
              hiddenIds={hiddenIds}
              exportName="Invoices"
              noun="invoice"
              emptyTitle="No invoices yet"
              emptyHint="Use + New invoice to make your first one."
              toolbarRight={<PostsButton on={on} onClick={() => setShowPosting(true)} />}
            />
          </div>
          <InvoiceCards invoices={invoices} businessId={businessId} currency={currency} />
        </>
      )}

      {showPosting && (
        <PostingDialog businessId={businessId} tableName="Invoices" config={postingConfig} onClose={() => setShowPosting(false)} />
      )}
      {showClients && (
        <Modal title="Clients" onClose={() => setShowClients(false)} wide>
          <ClientManager businessId={businessId} clients={clients} />
        </Modal>
      )}
    </>
  )
}
