import { describe, expect, it } from 'vitest'
import { markDuplicates, parseDelimited, prepareRows, rowValues } from './paste-import'
import { ORDER_TARGETS, checkOrderRows, existingOrderKeys, orderCashbookTotals, orderKey, parseFundTreatment, parseStatus, type OrderImportRow } from './orders-import'
import type { Order } from '../types/api'

const good = { orderDate: '10 Oct 2026', customer: 'afrina', phone: '1712345678', subtotal: '100', status: 'Delivered' }
const ok = (values: Record<string, string>) => {
  const [result] = checkOrderRows([values])
  if (result.check.status !== 'ok') throw new Error(JSON.stringify(result.check))
  return result.check.row
}

describe('parseStatus / parseFundTreatment', () => {
  it('reads the words people use, an empty status is New', () => {
    expect(parseStatus('Delivered')).toBe('DELIVERED')
    expect(parseStatus(' shipped ')).toBe('SHIPPED')
    expect(parseStatus('RETURNED')).toBe('RETURNED')
    expect(parseStatus('')).toBe('NEW')
    expect(parseStatus('Pending')).toBe('NEW')
    expect(parseStatus('lost')).toBeNull()
    expect(parseFundTreatment('')).toBe('MONEY_IN')
    expect(parseFundTreatment('Money in')).toBe('MONEY_IN')
    expect(parseFundTreatment('Deduct from fund')).toBe('DEDUCT_FROM_FUND')
    expect(parseFundTreatment('burn it')).toBeNull()
  })
})

describe('checkOrderRows', () => {
  it('turns a good row into an order the server can take', () => {
    const row = ok(good)
    expect(row.order).toMatchObject({
      orderDate: '2026-10-10',
      customerName: 'afrina',
      customerPhone: '1712345678',
      subtotal: 100,
      deliveryCharge: 0,
      discount: 0,
      status: 'DELIVERED',
      postingRule: 'MONEY_IN',
      deliveryDate: null,
    })
    expect(row).toMatchObject({ total: 100, posts: 'in' })
  })

  it('works out the total like the server: subtotal + delivery - discount, in cents', () => {
    expect(ok({ ...good, status: 'New', subtotal: '850', delivery: '100', discount: '50.10' }).total).toBe(899.9)
  })

  it('only delivered orders post, in or out by the fund treatment', () => {
    expect(ok({ ...good, status: 'Shipped' }).posts).toBeNull()
    expect(ok({ ...good, status: 'Cancelled' }).posts).toBeNull()
    expect(ok({ ...good, fund: 'Deduct from fund' }).posts).toBe('out')
  })

  it('totals the money the delivered ones post', () => {
    const rows = [ok(good), ok({ ...good, subtotal: '40', fund: 'Deduct from fund' }), ok({ ...good, status: 'New', subtotal: '999' })] as OrderImportRow[]
    expect(orderCashbookTotals(rows)).toEqual({ moneyIn: 100, moneyOut: 40 })
  })

  it.each([
    [{ ...good, orderDate: 'soon' }, 'Order date: use a date like 12 Oct 2026.'],
    [{ ...good, orderDate: '1 Jan 2099' }, "Entries can't be dated in the future."],
    [{ ...good, customer: '' }, 'Customer: type a name.'],
    [{ ...good, phone: 'call' }, 'Phone: digits, spaces and + - ( ) . only.'],
    [{ ...good, email: 'nope' }, 'Email: that does not look like an email address.'],
    [{ ...good, subtotal: '' }, 'Subtotal: type a number, like 1,250.'],
    [{ ...good, subtotal: 'abc' }, 'Subtotal: Type a number, like 1,250.'],
    [{ ...good, discount: '500' }, 'The discount is bigger than the order.'],
    [{ ...good, status: 'lost' }, 'Status: “lost” is not one of New, Confirmed, Shipped, Delivered, Cancelled, Returned.'],
    [{ ...good, fund: 'burn' }, 'Fund treatment: use “Money in” or “Deduct from fund”.'],
    [{ ...good, subtotal: '0' }, 'A delivered order needs a total above 0.'],
    [{ ...good, deliveredOn: 'x' }, 'Delivered on: use a date like 12 Oct 2026.'],
  ])('refuses %j', (values, message) => {
    expect(checkOrderRows([values])[0].check).toEqual({ status: 'error', message })
  })

  it('a delivery date is kept; without one the server counts the order date', () => {
    expect(ok({ ...good, deliveredOn: '11 Oct 2026' }).order.deliveryDate).toBe('2026-10-11')
    expect(ok(good).order.deliveryDate).toBeNull()
  })
})

describe('the same order again', () => {
  const existing = [{ orderDate: '2026-10-10T00:00:00.000Z', customerName: 'Afrina', total: 100 }] as Order[]

  it('same day + customer + total is already there', () => {
    const checked = checkOrderRows([good, { ...good, customer: 'Rafi' }])
    expect(markDuplicates(checked, existingOrderKeys(existing)).map((r) => r.status)).toEqual(['duplicate', 'ok'])
    expect(orderKey('2026-10-10', ' Afrina ', 100)).toBe('2026-10-10|afrina|100.00')
  })
})

describe('a pasted block of orders', () => {
  it('matches the header by name, however the order form named its questions', () => {
    const block = [
      'Order Date\tCustomer Name\tPhone\tItems Ordered\tItems Subtotal (BDT)\tDelivery Charge (BDT)\tDiscount (BDT)\tPayment Method',
      '13 Oct 2026\tFarhana Islam\t1712004455\tMango bands x 3\t1,950\t100\t0\tbKash',
    ].join('\n')
    const prepared = prepareRows(parseDelimited(block), ORDER_TARGETS)
    expect(prepared.mapping).toEqual(['orderDate', 'customer', 'phone', 'items', 'subtotal', 'delivery', 'discount', 'payment'])
    const row = ok(rowValues(prepared.rows[0], prepared.mapping))
    expect(row).toMatchObject({ total: 2050, posts: null })
    expect(row.order.paymentMethod).toBe('bKash')
  })
})
