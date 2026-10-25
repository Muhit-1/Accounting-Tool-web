import { describe, expect, it } from 'vitest'
import { DEFAULT_POSTING_CONFIG, POSTABLE_INVOICE_STATUSES, invoicePosts, previewInvoices, previewText, savedText } from './posting-config'
import type { PostingConfig, PostingSaveResult } from '../types/api'

const invoice = (status: string, total: number) => ({ status, total }) as Parameters<typeof previewInvoices>[0][number]

describe('defaults', () => {
  it('invoices stay off and post when paid', () => {
    expect(DEFAULT_POSTING_CONFIG).toEqual({ invoices: { on: false, when: ['PAID'] } })
  })

  it('a draft or cancelled invoice can never be chosen', () => {
    expect(POSTABLE_INVOICE_STATUSES).not.toContain('DRAFT')
    expect(POSTABLE_INVOICE_STATUSES).not.toContain('CANCELLED')
  })
})

describe('what posts', () => {
  const config: PostingConfig = { invoices: { on: true, when: ['PAID'] } }

  it('an invoice posts only while the switch is on and its status is chosen', () => {
    expect(invoicePosts(config, 'PAID')).toBe(true)
    expect(invoicePosts(config, 'SENT')).toBe(false)
    expect(invoicePosts(DEFAULT_POSTING_CONFIG, 'PAID')).toBe(false)
  })
})

describe('the preview in the dialog', () => {
  it('says how many invoices would post and what they add up to', () => {
    const rows = [invoice('PAID', 2500), invoice('PAID', 3000), invoice('SENT', 800), invoice('DRAFT', 1200)]
    const preview = previewInvoices(rows, ['PAID'])
    expect(preview).toEqual({ posting: 2, of: 4, total: 5500, empty: 0 })
    expect(previewText(preview)).toBe('2 of 4 rows would post, total 5,500.00')
  })

  it('counts a row with nothing to post, and says "row" for one', () => {
    const preview = previewInvoices([invoice('PAID', 0)], ['PAID'])
    expect(preview.empty).toBe(1)
    expect(previewText(preview)).toBe('1 of 1 row would post, total 0.00')
  })
})

describe('the line after saving', () => {
  const saved = (posted: number, removed: number): PostingSaveResult => ({ config: DEFAULT_POSTING_CONFIG, changes: { invoices: { posted, removed } } })

  it('says what changed in the Cash book', () => {
    expect(savedText(saved(0, 0))).toBe('Saved.')
    expect(savedText(saved(3, 0))).toBe('Saved. 3 added to the Cash book.')
    expect(savedText(saved(3, 1))).toBe('Saved. 3 added to the Cash book, 1 removed.')
    expect(savedText(saved(0, 2))).toBe('Saved. 2 removed.')
  })
})
