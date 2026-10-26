import { describe, expect, it } from 'vitest'
import type { Invoice, InvoiceStatus } from '../types/api'
import { filterInvoices, statusCounts, visibleTabs } from './invoices-list'

const make = (number: string, client: string, status: InvoiceStatus): Invoice =>
  ({
    id: `i${number}`,
    businessId: 'b',
    clientId: 'c',
    number,
    issueDate: '2026-10-01',
    terms: '',
    dueDate: '2026-10-31',
    subTotal: 100,
    total: 100,
    status,
    paidAt: null,
    fileReference: null,
    createdAt: '',
    updatedAt: '',
    client: { id: 'c', businessId: 'b', name: client, address: '', email: null },
  }) as Invoice

const list = [make('1004', 'Hello Dhaka Ltd', 'SENT'), make('1003', 'Greenleaf Studio', 'OVERDUE'), make('1002', 'Hello Dhaka Ltd', 'PAID'), make('1001', 'Rina Traders', 'PAID'), make('1000', 'Greenleaf Studio', 'DRAFT')]

describe('statusCounts', () => {
  it('counts every status and the total', () => {
    expect(statusCounts(list)).toEqual({ ALL: 5, DRAFT: 1, SENT: 1, OVERDUE: 1, PAID: 2, CANCELLED: 0 })
    expect(statusCounts([]).ALL).toBe(0)
  })
})

describe('visibleTabs', () => {
  it('shows Cancelled only when there is a cancelled invoice', () => {
    expect(visibleTabs(statusCounts(list)).map((t) => t.value)).toEqual(['ALL', 'DRAFT', 'SENT', 'OVERDUE', 'PAID'])
    expect(visibleTabs(statusCounts([...list, make('999', 'X', 'CANCELLED')])).map((t) => t.value)).toContain('CANCELLED')
  })
})

describe('filterInvoices', () => {
  it('filters by status', () => {
    expect(filterInvoices(list, 'PAID', '').map((i) => i.number)).toEqual(['1002', '1001'])
    expect(filterInvoices(list, 'ALL', '')).toHaveLength(5)
  })

  it('searches the number and the client together, by every word', () => {
    expect(filterInvoices(list, 'ALL', 'hello').map((i) => i.number)).toEqual(['1004', '1002'])
    expect(filterInvoices(list, 'ALL', 'inv-1001').map((i) => i.number)).toEqual(['1001'])
    expect(filterInvoices(list, 'ALL', 'green studio').map((i) => i.number)).toEqual(['1003', '1000'])
    expect(filterInvoices(list, 'ALL', 'green nobody')).toEqual([])
  })

  it('combines status and search', () => {
    expect(filterInvoices(list, 'PAID', 'hello').map((i) => i.number)).toEqual(['1002'])
  })
})
