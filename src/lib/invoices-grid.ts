// The rules of the Invoices grid, apart from the screen: what an edited cell
// turns into and what is refused first with a plain message. The server
// checks all of it again (only a draft can change; status moves follow the
// allowed table) and works out every total.
import { parseDateInput } from './grid-parse'
import { INVOICE_STATUS_LABEL, isInvoiceEditable, statusChoices } from './invoices'
import type { Client, Invoice, InvoiceStatus } from '../types/api'

export type InvoicePlan =
  | { kind: 'noop' }
  | { kind: 'error'; message: string }
  | { kind: 'patch'; patch: { issueDate?: string; clientId?: string } }
  // The status has its own endpoint (it checks the allowed moves and posts the Cash book entry).
  | { kind: 'status'; status: InvoiceStatus }

const NOOP: InvoicePlan = { kind: 'noop' }
const fail = (message: string): InvoicePlan => ({ kind: 'error', message })

const STATUSES = Object.keys(INVOICE_STATUS_LABEL) as InvoiceStatus[]

// Typing in a cell of an existing invoice. The invoice number and the amount
// are worked out by the app and cannot be typed in.
export function planInvoiceEdit(invoice: Invoice, columnId: string, text: string, clients: Pick<Client, 'id' | 'name'>[]): InvoicePlan {
  if (columnId === 'status') {
    const next = text as InvoiceStatus
    if (!STATUSES.includes(next)) return fail('Choose one of the statuses.')
    if (next === invoice.status) return NOOP
    if (!statusChoices(invoice.status).includes(next)) {
      return fail(`${INVOICE_STATUS_LABEL[invoice.status]} can't move to ${INVOICE_STATUS_LABEL[next].toLowerCase()}.`)
    }
    return { kind: 'status', status: next }
  }
  if (!isInvoiceEditable(invoice.status)) {
    return fail('Only a draft can be changed. Open the invoice to move it on.')
  }
  switch (columnId) {
    case 'date': {
      const iso = parseDateInput(text)
      if (!iso) return fail('Use a date like 12 Oct 2026.')
      return iso === invoice.issueDate.slice(0, 10) ? NOOP : { kind: 'patch', patch: { issueDate: iso } }
    }
    case 'client': {
      if (!clients.some((client) => client.id === text)) return fail('Choose one of your clients.')
      return text === invoice.clientId ? NOOP : { kind: 'patch', patch: { clientId: text } }
    }
    default:
      return NOOP
  }
}

// Only a draft or a cancelled invoice can be deleted.
export function splitDeletable(invoices: Invoice[]): { deletable: Invoice[]; kept: number } {
  const deletable = invoices.filter((invoice) => invoice.status === 'DRAFT' || invoice.status === 'CANCELLED')
  return { deletable, kept: invoices.length - deletable.length }
}
