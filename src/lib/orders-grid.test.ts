import { describe, expect, it } from 'vitest'
import { buildNewOrder, planOrderEdit, type NewOrderDraft } from './orders-grid'
import type { Order } from '../types/api'

const TODAY = '2026-10-13'

function order(extra: Partial<Order> = {}): Order {
  return {
    id: 'o1',
    accountId: 'a',
    number: 3,
    displayNumber: 'SJ-0003',
    orderDate: '2026-10-11T00:00:00.000Z',
    customerName: 'Nusrat Jahan',
    customerPhone: '01911223344',
    customerEmail: null,
    customerAddress: null,
    items: 'Mango bands x 2',
    subtotal: 1300,
    deliveryCharge: 100,
    discount: 0,
    total: 1400,
    paymentMethod: 'bKash',
    status: 'CONFIRMED',
    postingRule: 'MONEY_IN',
    deliveryDate: null,
    notes: null,
    transactionId: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  }
}

describe('planOrderEdit: text cells', () => {
  it('saves a changed customer, trimmed, and does nothing for the same one', () => {
    expect(planOrderEdit(order(), 'customer', '  Rafi  ', TODAY)).toEqual({ kind: 'patch', patch: { customerName: 'Rafi' } })
    expect(planOrderEdit(order(), 'customer', 'Nusrat Jahan', TODAY)).toEqual({ kind: 'noop' })
    expect(planOrderEdit(order(), 'customer', '  ', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order(), 'customer', 'x'.repeat(121), TODAY)).toMatchObject({ kind: 'error' })
  })

  it('checks a phone number and lets it be cleared', () => {
    expect(planOrderEdit(order(), 'phone', '1712345678', TODAY)).toEqual({ kind: 'patch', patch: { customerPhone: '1712345678' } })
    expect(planOrderEdit(order(), 'phone', 'call me', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order(), 'phone', '', TODAY)).toEqual({ kind: 'patch', patch: { customerPhone: null } })
    expect(planOrderEdit(order({ customerPhone: null }), 'phone', '', TODAY)).toEqual({ kind: 'noop' })
  })

  it('clears items, notes and payment with an empty cell', () => {
    expect(planOrderEdit(order(), 'items', '', TODAY)).toEqual({ kind: 'patch', patch: { items: null } })
    expect(planOrderEdit(order(), 'notes', 'Sample', TODAY)).toEqual({ kind: 'patch', patch: { notes: 'Sample' } })
    expect(planOrderEdit(order(), 'payment', 'Nagad', TODAY)).toEqual({ kind: 'patch', patch: { paymentMethod: 'Nagad' } })
    expect(planOrderEdit(order(), 'items', 'x'.repeat(2001), TODAY)).toMatchObject({ kind: 'error' })
  })
})

describe('planOrderEdit: dates', () => {
  it('reads any accepted date form and refuses the future', () => {
    expect(planOrderEdit(order(), 'orderDate', '12/10/2026', TODAY)).toEqual({ kind: 'patch', patch: { orderDate: '2026-10-12' } })
    expect(planOrderEdit(order(), 'orderDate', '11 Oct 2026', TODAY)).toEqual({ kind: 'noop' })
    expect(planOrderEdit(order(), 'orderDate', 'soon', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order(), 'orderDate', '1 Jan 2099', TODAY)).toMatchObject({ kind: 'error' })
  })

  it('Delivered on can be set, changed and cleared', () => {
    expect(planOrderEdit(order(), 'deliveredOn', '12 Oct 2026', TODAY)).toEqual({ kind: 'patch', patch: { deliveryDate: '2026-10-12' } })
    expect(planOrderEdit(order({ deliveryDate: '2026-10-12T00:00:00.000Z' }), 'deliveredOn', '', TODAY)).toEqual({ kind: 'patch', patch: { deliveryDate: null } })
    expect(planOrderEdit(order(), 'deliveredOn', '', TODAY)).toEqual({ kind: 'noop' })
  })
})

describe('planOrderEdit: money cells', () => {
  it('saves a subtotal, reading 1,250', () => {
    expect(planOrderEdit(order(), 'subtotal', '1,250', TODAY)).toEqual({ kind: 'patch', patch: { subtotal: 1250 } })
    expect(planOrderEdit(order(), 'subtotal', '1,300', TODAY)).toEqual({ kind: 'noop' })
    expect(planOrderEdit(order(), 'subtotal', '', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order(), 'subtotal', 'abc', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order(), 'subtotal', '-5', TODAY)).toMatchObject({ kind: 'error' })
  })

  it('delivery and discount may be empty (0)', () => {
    expect(planOrderEdit(order(), 'delivery', '', TODAY)).toEqual({ kind: 'patch', patch: { deliveryCharge: 0 } })
    expect(planOrderEdit(order(), 'discount', '50', TODAY)).toEqual({ kind: 'patch', patch: { discount: 50 } })
    expect(planOrderEdit(order(), 'discount', '', TODAY)).toEqual({ kind: 'noop' })
  })

  it('refuses a discount bigger than the order, and a zero total on a delivered order', () => {
    expect(planOrderEdit(order(), 'discount', '5,000', TODAY)).toEqual({ kind: 'error', message: 'The discount is bigger than the order.' })
    expect(planOrderEdit(order({ status: 'DELIVERED' }), 'discount', '1,400', TODAY)).toEqual({ kind: 'error', message: 'A delivered order needs a total above 0.' })
    expect(planOrderEdit(order({ status: 'DELIVERED' }), 'discount', '1,399', TODAY)).toMatchObject({ kind: 'patch' })
  })
})

describe('planOrderEdit: status', () => {
  it('follows the allowed moves, with a plain message for the others', () => {
    expect(planOrderEdit(order(), 'status', 'SHIPPED', TODAY)).toEqual({ kind: 'status', status: 'SHIPPED' })
    expect(planOrderEdit(order(), 'status', 'CANCELLED', TODAY)).toEqual({ kind: 'status', status: 'CANCELLED' })
    expect(planOrderEdit(order(), 'status', 'DELIVERED', TODAY)).toEqual({ kind: 'error', message: "Confirmed can't move to delivered." })
    expect(planOrderEdit(order(), 'status', 'CONFIRMED', TODAY)).toEqual({ kind: 'noop' })
    expect(planOrderEdit(order(), 'status', 'WHATEVER', TODAY)).toMatchObject({ kind: 'error' })
  })

  it('delivering with no delivery date means today', () => {
    expect(planOrderEdit(order({ status: 'SHIPPED' }), 'status', 'DELIVERED', TODAY)).toEqual({ kind: 'status', status: 'DELIVERED', deliveryDate: TODAY })
    expect(planOrderEdit(order({ status: 'SHIPPED', deliveryDate: '2026-10-12T00:00:00.000Z' }), 'status', 'DELIVERED', TODAY)).toEqual({ kind: 'status', status: 'DELIVERED' })
  })

  it('a delivered order can step back or be returned; cancelled and returned are final', () => {
    expect(planOrderEdit(order({ status: 'DELIVERED' }), 'status', 'SHIPPED', TODAY)).toEqual({ kind: 'status', status: 'SHIPPED' })
    expect(planOrderEdit(order({ status: 'DELIVERED' }), 'status', 'RETURNED', TODAY)).toEqual({ kind: 'status', status: 'RETURNED' })
    expect(planOrderEdit(order({ status: 'CANCELLED' }), 'status', 'NEW', TODAY)).toMatchObject({ kind: 'error' })
    expect(planOrderEdit(order({ status: 'CANCELLED' }), 'customer', 'Someone', TODAY)).toEqual({
      kind: 'error',
      message: "A cancelled order is closed. It can't be changed.",
    })
    expect(planOrderEdit(order({ status: 'RETURNED' }), 'subtotal', '5', TODAY)).toMatchObject({ kind: 'error' })
  })

  it('fund treatment follows the order until it is final', () => {
    expect(planOrderEdit(order(), 'fund', 'DEDUCT_FROM_FUND', TODAY)).toEqual({ kind: 'patch', patch: { postingRule: 'DEDUCT_FROM_FUND' } })
    expect(planOrderEdit(order(), 'fund', 'MONEY_IN', TODAY)).toEqual({ kind: 'noop' })
    expect(planOrderEdit(order(), 'fund', 'nonsense', TODAY)).toMatchObject({ kind: 'error' })
  })
})

describe('buildNewOrder', () => {
  const draft = (extra: Partial<NewOrderDraft> = {}): NewOrderDraft => ({
    orderDate: '',
    customer: ' Tania Akter ',
    phone: '',
    items: '',
    subtotal: '2,200',
    delivery: '120',
    discount: '',
    payment: 'Nagad',
    status: '',
    fund: '',
    deliveredOn: '',
    notes: '',
    ...extra,
  })

  it('builds an order: date defaults to today, status to New, money in', () => {
    expect(buildNewOrder(draft(), TODAY)).toEqual({
      ok: true,
      input: {
        orderDate: TODAY,
        customerName: 'Tania Akter',
        customerPhone: null,
        items: null,
        subtotal: 2200,
        deliveryCharge: 120,
        discount: 0,
        paymentMethod: 'Nagad',
        postingRule: 'MONEY_IN',
        deliveryDate: null,
        notes: null,
        status: 'NEW',
      },
    })
  })

  it('a delivered order with no date is delivered today; a fund deduction is kept', () => {
    expect(buildNewOrder(draft({ status: 'DELIVERED', fund: 'DEDUCT_FROM_FUND' }), TODAY)).toMatchObject({
      ok: true,
      input: { status: 'DELIVERED', deliveryDate: TODAY, postingRule: 'DEDUCT_FROM_FUND' },
    })
  })

  it('needs a customer and names the column of every other problem', () => {
    expect(buildNewOrder(draft({ customer: ' ' }), TODAY)).toEqual({ ok: false, column: 'customer', message: 'Customer: type a name.' })
    expect(buildNewOrder(draft({ orderDate: 'soon' }), TODAY)).toMatchObject({ ok: false, column: 'orderDate' })
    expect(buildNewOrder(draft({ orderDate: '1 Jan 2099' }), TODAY)).toMatchObject({ ok: false, column: 'orderDate' })
    expect(buildNewOrder(draft({ subtotal: 'abc' }), TODAY)).toMatchObject({ ok: false, column: 'subtotal' })
    expect(buildNewOrder(draft({ discount: '9,999' }), TODAY)).toEqual({ ok: false, column: 'discount', message: 'The discount is bigger than the order.' })
    expect(buildNewOrder(draft({ status: 'DELIVERED', subtotal: '', delivery: '' }), TODAY)).toMatchObject({ ok: false, column: 'subtotal' })
    expect(buildNewOrder(draft({ phone: 'abc' }), TODAY)).toMatchObject({ ok: false, column: 'phone' })
    expect(buildNewOrder(draft({ deliveredOn: 'x' }), TODAY)).toMatchObject({ ok: false, column: 'deliveredOn' })
    expect(buildNewOrder(draft({ status: 'WHAT' }), TODAY)).toMatchObject({ ok: false, column: 'status' })
  })
})
