import { describe, expect, it } from 'vitest'
import {
  DEFAULT_POSTING_CONFIG,
  POSTABLE_INVOICE_STATUSES,
  POSTABLE_ORDER_STATUSES,
  invoicePosts,
  orderPosts,
  previewInvoices,
  previewOrders,
  previewText,
  savedText,
  tablePosts,
} from './posting-config'
import type { PostingConfig, PostingSaveResult } from '../types/api'

const order = (status: string, total: number, postingRule: 'MONEY_IN' | 'DEDUCT_FROM_FUND' = 'MONEY_IN') =>
  ({ status, total, postingRule }) as Parameters<typeof previewOrders>[0][number]

describe('defaults', () => {
  it('orders post when delivered, costs post, invoices stay off', () => {
    expect(DEFAULT_POSTING_CONFIG).toEqual({
      orders: { on: true, when: ['DELIVERED'] },
      costs: { on: true },
      invoices: { on: false, when: ['PAID'] },
    })
  })

  it('a cancelled or returned order and a draft or cancelled invoice can never be chosen', () => {
    expect(POSTABLE_ORDER_STATUSES).not.toContain('CANCELLED')
    expect(POSTABLE_ORDER_STATUSES).not.toContain('RETURNED')
    expect(POSTABLE_INVOICE_STATUSES).not.toContain('DRAFT')
    expect(POSTABLE_INVOICE_STATUSES).not.toContain('CANCELLED')
  })
})

describe('what posts', () => {
  const config: PostingConfig = { orders: { on: true, when: ['SHIPPED', 'DELIVERED'] }, costs: { on: false }, invoices: { on: true, when: ['PAID'] } }

  it('an order posts only while the table is on and its status is chosen', () => {
    expect(orderPosts(config, 'SHIPPED')).toBe(true)
    expect(orderPosts(config, 'NEW')).toBe(false)
    expect(orderPosts({ ...config, orders: { on: false, when: ['DELIVERED'] } }, 'DELIVERED')).toBe(false)
  })

  it('an invoice posts only while the table is on and its status is chosen', () => {
    expect(invoicePosts(config, 'PAID')).toBe(true)
    expect(invoicePosts(config, 'SENT')).toBe(false)
    expect(invoicePosts(DEFAULT_POSTING_CONFIG, 'PAID')).toBe(false)
  })

  it('tablePosts reads the table switch', () => {
    expect(tablePosts(config, 'orders')).toBe(true)
    expect(tablePosts(config, 'costs')).toBe(false)
    expect(tablePosts(config, 'invoices')).toBe(true)
  })
})

describe('the preview in the dialog', () => {
  it('says how many rows would post and what they add up to', () => {
    const rows = [order('DELIVERED', 2500), order('DELIVERED', 3000), order('SHIPPED', 800), order('NEW', 1200)]
    const preview = previewOrders(rows, ['DELIVERED'])
    expect(preview).toEqual({ posting: 2, of: 4, total: 5500, empty: 0 })
    expect(previewText(preview)).toBe('2 of 4 rows would post, total 5,500.00')
  })

  it('more statuses chosen, more rows', () => {
    const rows = [order('DELIVERED', 2500), order('SHIPPED', 800), order('NEW', 1200), order('CANCELLED', 100)]
    expect(previewOrders(rows, ['SHIPPED', 'DELIVERED'])).toMatchObject({ posting: 2, total: 3300 })
  })

  it('money taken out of the fund counts negative', () => {
    expect(previewOrders([order('DELIVERED', 1000), order('DELIVERED', 250, 'DEDUCT_FROM_FUND')], ['DELIVERED']).total).toBe(750)
  })

  it('adds in whole cents', () => {
    expect(previewOrders([order('DELIVERED', 0.1), order('DELIVERED', 0.2)], ['DELIVERED']).total).toBe(0.3)
  })

  it('counts rows with nothing to post, which the server would refuse', () => {
    expect(previewOrders([order('DELIVERED', 0), order('DELIVERED', 10)], ['DELIVERED']).empty).toBe(1)
  })

  it('works for invoices and for a table with one row', () => {
    const rows = [
      { status: 'PAID', total: 1000 },
      { status: 'SENT', total: 500 },
    ] as Parameters<typeof previewInvoices>[0]
    const preview = previewInvoices(rows, ['PAID'])
    expect(preview).toEqual({ posting: 1, of: 2, total: 1000, empty: 0 })
    expect(previewText(previewInvoices(rows.slice(0, 1), ['PAID']))).toBe('1 of 1 row would post, total 1,000.00')
  })
})

describe('savedText', () => {
  const result = (posted: number, removed: number): PostingSaveResult => ({
    config: DEFAULT_POSTING_CONFIG,
    changes: { orders: { posted, removed }, costs: { posted: 0, removed: 0 }, invoices: { posted: 0, removed: 0 } },
  })

  it('names what changed in the Cash book', () => {
    expect(savedText(result(0, 0))).toBe('Saved.')
    expect(savedText(result(3, 0))).toBe('Saved. 3 added to the Cash book.')
    expect(savedText(result(2, 1))).toBe('Saved. 2 added to the Cash book, 1 removed.')
  })
})
