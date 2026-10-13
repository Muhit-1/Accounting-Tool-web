import { describe, expect, it } from 'vitest'
import { planInvoiceEdit, splitDeletable } from './invoices-grid'
import type { Invoice } from '../types/api'

const CLIENTS = [
  { id: 'c1', name: 'Acme' },
  { id: 'c2', name: 'Globex' },
]

function invoice(extra: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i1',
    businessId: 'b',
    clientId: 'c1',
    number: '0007',
    issueDate: '2026-10-05T00:00:00.000Z',
    terms: '',
    dueDate: '2026-10-20T00:00:00.000Z',
    subTotal: 1000,
    total: 1000,
    status: 'DRAFT',
    paidAt: null,
    fileReference: null,
    createdAt: '',
    updatedAt: '',
    client: { id: 'c1', businessId: 'b', name: 'Acme', address: '', email: null },
    ...extra,
  }
}

describe('planInvoiceEdit: status', () => {
  it('moves along the allowed table', () => {
    expect(planInvoiceEdit(invoice(), 'status', 'SENT', CLIENTS)).toEqual({ kind: 'status', status: 'SENT' })
    expect(planInvoiceEdit(invoice({ status: 'SENT' }), 'status', 'PAID', CLIENTS)).toEqual({ kind: 'status', status: 'PAID' })
    expect(planInvoiceEdit(invoice({ status: 'PAID' }), 'status', 'SENT', CLIENTS)).toEqual({ kind: 'status', status: 'SENT' })
  })

  it('refuses a move that is not allowed, and a cancelled invoice is final', () => {
    expect(planInvoiceEdit(invoice(), 'status', 'PAID', CLIENTS)).toEqual({ kind: 'error', message: 'Draft can\'t move to paid.' })
    expect(planInvoiceEdit(invoice({ status: 'CANCELLED' }), 'status', 'SENT', CLIENTS).kind).toBe('error')
  })

  it('the same status is nothing to do; an unknown one is refused', () => {
    expect(planInvoiceEdit(invoice(), 'status', 'DRAFT', CLIENTS)).toEqual({ kind: 'noop' })
    expect(planInvoiceEdit(invoice(), 'status', 'LOST', CLIENTS).kind).toBe('error')
  })

  it('works on a sent invoice (status is the one cell that stays open)', () => {
    expect(planInvoiceEdit(invoice({ status: 'OVERDUE' }), 'status', 'PAID', CLIENTS)).toEqual({ kind: 'status', status: 'PAID' })
  })
})

describe('planInvoiceEdit: date and client of a draft', () => {
  it('changes the issue date', () => {
    expect(planInvoiceEdit(invoice(), 'date', '12 Oct 2026', CLIENTS)).toEqual({ kind: 'patch', patch: { issueDate: '2026-10-12' } })
  })

  it('the same date is nothing to do; a bad one is refused', () => {
    expect(planInvoiceEdit(invoice(), 'date', '5 Oct 2026', CLIENTS)).toEqual({ kind: 'noop' })
    expect(planInvoiceEdit(invoice(), 'date', 'soon', CLIENTS).kind).toBe('error')
  })

  it('changes the client, only to one that exists', () => {
    expect(planInvoiceEdit(invoice(), 'client', 'c2', CLIENTS)).toEqual({ kind: 'patch', patch: { clientId: 'c2' } })
    expect(planInvoiceEdit(invoice(), 'client', 'c1', CLIENTS)).toEqual({ kind: 'noop' })
    expect(planInvoiceEdit(invoice(), 'client', 'nope', CLIENTS).kind).toBe('error')
  })
})

describe('planInvoiceEdit: what stays locked', () => {
  it('a sent invoice cannot change date or client', () => {
    expect(planInvoiceEdit(invoice({ status: 'SENT' }), 'date', '12 Oct 2026', CLIENTS).kind).toBe('error')
    expect(planInvoiceEdit(invoice({ status: 'PAID' }), 'client', 'c2', CLIENTS).kind).toBe('error')
  })

  it('the number and the amount are never typed in', () => {
    expect(planInvoiceEdit(invoice(), 'n', '9', CLIENTS)).toEqual({ kind: 'noop' })
    expect(planInvoiceEdit(invoice(), 'amount', '5', CLIENTS)).toEqual({ kind: 'noop' })
  })
})

describe('splitDeletable', () => {
  it('keeps the sent and paid ones', () => {
    const rows = [invoice({ id: 'a' }), invoice({ id: 'b', status: 'SENT' }), invoice({ id: 'c', status: 'CANCELLED' }), invoice({ id: 'd', status: 'PAID' })]
    const { deletable, kept } = splitDeletable(rows)
    expect(deletable.map((row) => row.id)).toEqual(['a', 'c'])
    expect(kept).toBe(2)
  })
})
