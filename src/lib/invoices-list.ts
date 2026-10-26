import type { Invoice, InvoiceStatus } from '../types/api'

// The Invoices list: which invoices a status tab and a search show, and the number on each tab.

export type StatusFilter = 'ALL' | InvoiceStatus

// The tabs, in the order people think of an invoice's life. Cancelled only shows up when there is one.
export const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SENT', label: 'Pending' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export function statusCounts(invoices: Invoice[]): Record<StatusFilter, number> {
  const counts: Record<StatusFilter, number> = { ALL: invoices.length, DRAFT: 0, SENT: 0, OVERDUE: 0, PAID: 0, CANCELLED: 0 }
  for (const invoice of invoices) counts[invoice.status] += 1
  return counts
}

export function visibleTabs(counts: Record<StatusFilter, number>): typeof STATUS_TABS {
  return STATUS_TABS.filter((tab) => tab.value !== 'CANCELLED' || counts.CANCELLED > 0)
}

/** An invoice matches a search when every word typed is in its number or its client's name. */
export function filterInvoices(invoices: Invoice[], status: StatusFilter, query: string): Invoice[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  return invoices.filter((invoice) => {
    if (status !== 'ALL' && invoice.status !== status) return false
    if (words.length === 0) return true
    const hay = `inv-${invoice.number} ${invoice.number} ${invoice.client.name}`.toLowerCase()
    return words.every((word) => hay.includes(word))
  })
}

// What a menu says for each move an invoice can make.
export const STATUS_ACTION: Record<InvoiceStatus, string> = {
  DRAFT: 'Back to draft',
  SENT: 'Mark as sent',
  OVERDUE: 'Mark as overdue',
  PAID: 'Mark as paid',
  CANCELLED: 'Cancel this invoice',
}
