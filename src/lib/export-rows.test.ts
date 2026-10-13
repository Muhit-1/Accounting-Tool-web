import { describe, expect, it } from 'vitest'
import { cashbookExport, costsExport, ordersExport } from './export-rows'
import { toCsv } from './export-table'
import type { CostItem, Order, Transaction } from '../types/api'

describe('cashbookExport', () => {
  it('one column of money in, one of money out, numbers kept as numbers', () => {
    const sheet = cashbookExport('Cash book', [
      { date: '2026-05-11T00:00:00.000Z', memo: '=1+1', category: { name: 'Sales' }, type: 'INCOME', amount: 5000, runningBalance: 5000, proofUrl: null },
      { date: '2026-05-12T00:00:00.000Z', memo: null, category: null, type: 'EXPENSE', amount: 4214.5, runningBalance: 785.5, proofUrl: 'https://x.test/p' },
    ] as Transaction[])
    expect(sheet.rows).toEqual([
      ['11 May 2026', '=1+1', 'Sales', 5000, null, 5000, ''],
      ['12 May 2026', '', '', null, 4214.5, 785.5, 'https://x.test/p'],
    ])
    // text that looks like a formula is made harmless when written
    expect(toCsv(sheet.headers, sheet.rows)).toContain("'=1+1")
  })
})

describe('ordersExport', () => {
  it('lists orders in number order with their labels', () => {
    const sheet = ordersExport('Orders', [
      { number: 3, displayNumber: 'SJ-0003', orderDate: '2026-10-11T00:00:00.000Z', customerName: 'B', status: 'SHIPPED', postingRule: 'MONEY_IN', subtotal: 1, deliveryCharge: 0, discount: 0, total: 1, deliveryDate: null },
      { number: 2, displayNumber: 'SJ-0002', orderDate: '2026-10-10T00:00:00.000Z', customerName: 'A', status: 'DELIVERED', postingRule: 'DEDUCT_FROM_FUND', subtotal: 100, deliveryCharge: 0, discount: 0, total: 100, deliveryDate: '2026-10-10T00:00:00.000Z' },
    ] as Order[])
    expect(sheet.rows.map((row) => [row[0], row[12], row[13], row[14]])).toEqual([
      ['SJ-0002', 'Delivered', 'Deduct from fund', '10 Oct 2026'],
      ['SJ-0003', 'Shipped', 'Money in', ''],
    ])
    expect(sheet.rows.every((row) => row.length === sheet.headers.length)).toBe(true)
  })
})

describe('costsExport', () => {
  it('says who paid in words', () => {
    const base = { number: 1, groupName: 'G', item: 'i', monthlyRate: 0, months: 0, oneTime: 5, total: 5, paidOn: null, notes: null }
    const sheet = costsExport('Costs', [
      { ...base, paidFrom: 'NONE', partnerName: null, status: 'DUE' },
      { ...base, paidFrom: 'BUSINESS', partnerName: null, status: 'PAID' },
      { ...base, paidFrom: 'PARTNER', partnerName: 'Shahidul Alam', status: 'PAID' },
    ] as CostItem[])
    expect(sheet.rows.map((row) => [row[7], row[8]])).toEqual([
      ['Not paid yet', 'Due'],
      ['Business money', 'Paid'],
      ['Shahidul Alam', 'Paid'],
    ])
  })
})
