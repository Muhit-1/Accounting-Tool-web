// The rules of the Orders grid, apart from the screen: what an edited cell or
// the add-row turns into, and what is refused first with a plain message. The
// server checks all of it again and works out every total and number.
import { futureDateError, parseDateInput, parseMoneyInput } from './grid-parse'
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  isOrderFinal,
  nextStatuses,
  orderTotal,
  type OrderPostingRule,
  type OrderStatus,
} from './order-status'
import type { OrderInput } from './orders'
import type { Order } from '../types/api'

export const PAYMENT_METHODS = ['Cash on Delivery', 'bKash', 'Nagad', 'Bank transfer', 'Card']

export const MAX_CUSTOMER = 120
export const MAX_PHONE = 30
export const MAX_ITEMS = 2000
export const MAX_NOTES = 1000
export const MAX_PAYMENT = 60

export type OrderPlan =
  | { kind: 'noop' }
  | { kind: 'error'; message: string }
  | { kind: 'patch'; patch: Partial<OrderInput> }
  // The status has its own endpoint (it checks the allowed moves and posts the fund entry).
  | { kind: 'status'; status: OrderStatus; deliveryDate?: string }

const NOOP: OrderPlan = { kind: 'noop' }
const fail = (message: string): OrderPlan => ({ kind: 'error', message })
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : null)

const PHONE_PATTERN = /^[0-9+\-\s().]+$/

function moneyField(order: Order, key: 'subtotal' | 'deliveryCharge' | 'discount', text: string): OrderPlan {
  const parsed = parseMoneyInput(text)
  if (parsed.kind === 'error') return fail(parsed.message)
  if (parsed.kind === 'empty' && key === 'subtotal') return fail('Type a number, like 1,250.')
  const value = parsed.kind === 'ok' ? parsed.value : 0
  if (value === order[key]) return NOOP
  const next = { subtotal: order.subtotal, deliveryCharge: order.deliveryCharge, discount: order.discount, [key]: value }
  const total = orderTotal(next.subtotal, next.deliveryCharge, next.discount)
  if (total === null) return fail('The discount is bigger than the order.')
  if (order.status === 'DELIVERED' && total <= 0) return fail('A delivered order needs a total above 0.')
  return { kind: 'patch', patch: { [key]: value } as Partial<OrderInput> }
}

// Typing in a cell of an existing order.
export function planOrderEdit(order: Order, columnId: string, text: string, today: string): OrderPlan {
  if (columnId === 'status') {
    const next = text as OrderStatus
    if (!ORDER_STATUSES.includes(next)) return fail('Choose one of the statuses.')
    if (next === order.status) return NOOP
    if (!nextStatuses(order.status).includes(next)) {
      return fail(`${ORDER_STATUS_LABEL[order.status]} can't move to ${ORDER_STATUS_LABEL[next].toLowerCase()}.`)
    }
    // "Delivered" with no delivery date is delivered today.
    return next === 'DELIVERED' && !order.deliveryDate ? { kind: 'status', status: next, deliveryDate: today } : { kind: 'status', status: next }
  }
  if (isOrderFinal(order.status)) {
    return fail(`A ${ORDER_STATUS_LABEL[order.status].toLowerCase()} order is closed. It can't be changed.`)
  }

  switch (columnId) {
    case 'orderDate': {
      const iso = parseDateInput(text)
      if (!iso) return fail('Use a date like 12 Oct 2026.')
      if (iso === day(order.orderDate)) return NOOP
      const future = futureDateError(iso)
      return future ? fail(future) : { kind: 'patch', patch: { orderDate: iso } }
    }
    case 'customer': {
      const name = text.trim()
      if (name === '') return fail('A customer needs a name.')
      if (name.length > MAX_CUSTOMER) return fail(`The name is too long (max ${MAX_CUSTOMER} characters).`)
      return name === order.customerName ? NOOP : { kind: 'patch', patch: { customerName: name } }
    }
    case 'phone': {
      const phone = text.trim()
      if (phone.length > MAX_PHONE) return fail(`The phone number is too long (max ${MAX_PHONE} characters).`)
      if (phone !== '' && !PHONE_PATTERN.test(phone)) return fail('A phone number can only have digits, spaces and + - ( ) .')
      // The server cleans the number up (the leading 0 in Bangladesh), so compare with what it would save.
      return phone === (order.customerPhone ?? '') ? NOOP : { kind: 'patch', patch: { customerPhone: phone === '' ? null : phone } }
    }
    case 'items': {
      const items = text.trim()
      if (items.length > MAX_ITEMS) return fail(`The items text is too long (max ${MAX_ITEMS} characters).`)
      return items === (order.items ?? '') ? NOOP : { kind: 'patch', patch: { items: items === '' ? null : items } }
    }
    case 'notes': {
      const notes = text.trim()
      if (notes.length > MAX_NOTES) return fail(`The notes are too long (max ${MAX_NOTES} characters).`)
      return notes === (order.notes ?? '') ? NOOP : { kind: 'patch', patch: { notes: notes === '' ? null : notes } }
    }
    case 'payment': {
      const method = text.trim()
      if (method.length > MAX_PAYMENT) return fail(`Too long (max ${MAX_PAYMENT} characters).`)
      return method === (order.paymentMethod ?? '') ? NOOP : { kind: 'patch', patch: { paymentMethod: method === '' ? null : method } }
    }
    case 'subtotal':
      return moneyField(order, 'subtotal', text)
    case 'delivery':
      return moneyField(order, 'deliveryCharge', text)
    case 'discount':
      return moneyField(order, 'discount', text)
    case 'fund': {
      const rule = text as OrderPostingRule
      if (rule !== 'MONEY_IN' && rule !== 'DEDUCT_FROM_FUND') return fail('Choose Money in or Deduct from fund.')
      return rule === order.postingRule ? NOOP : { kind: 'patch', patch: { postingRule: rule } }
    }
    case 'deliveredOn': {
      if (text.trim() === '') return order.deliveryDate === null ? NOOP : { kind: 'patch', patch: { deliveryDate: null } }
      const iso = parseDateInput(text)
      if (!iso) return fail('Use a date like 12 Oct 2026.')
      if (iso === day(order.deliveryDate)) return NOOP
      const future = futureDateError(iso)
      return future ? fail(future) : { kind: 'patch', patch: { deliveryDate: iso } }
    }
    default:
      return NOOP
  }
}

export interface NewOrderDraft {
  orderDate: string
  customer: string
  phone: string
  items: string
  subtotal: string
  delivery: string
  discount: string
  payment: string
  status: string
  fund: string
  deliveredOn: string
  notes: string
}

export type NewOrderResult =
  | { ok: true; input: Omit<OrderInput, 'accountId'> }
  | { ok: false; column: keyof NewOrderDraft; message: string }

// The blank add-row: a date (today), a customer, and the amounts; the server
// numbers the order and works out its total.
export function buildNewOrder(draft: NewOrderDraft, today: string): NewOrderResult {
  const bad = (column: keyof NewOrderDraft, message: string): NewOrderResult => ({ ok: false, column, message })

  const date = draft.orderDate.trim() === '' ? today : parseDateInput(draft.orderDate)
  if (!date) return bad('orderDate', 'Order date: use a date like 12 Oct 2026.')
  const future = futureDateError(date)
  if (future) return bad('orderDate', future)

  const customer = draft.customer.trim()
  if (customer === '') return bad('customer', 'Customer: type a name.')
  if (customer.length > MAX_CUSTOMER) return bad('customer', `Customer: too long (max ${MAX_CUSTOMER} characters).`)

  const phone = draft.phone.trim()
  if (phone.length > MAX_PHONE || (phone !== '' && !PHONE_PATTERN.test(phone))) return bad('phone', 'Phone: digits, spaces and + - ( ) . only.')

  const money = (column: 'subtotal' | 'delivery' | 'discount', label: string): number | NewOrderResult => {
    const parsed = parseMoneyInput(draft[column])
    if (parsed.kind === 'error') return bad(column, `${label}: ${parsed.message}`)
    return parsed.kind === 'ok' ? parsed.value : 0
  }
  const subtotal = money('subtotal', 'Subtotal')
  if (typeof subtotal !== 'number') return subtotal
  const delivery = money('delivery', 'Delivery')
  if (typeof delivery !== 'number') return delivery
  const discount = money('discount', 'Discount')
  if (typeof discount !== 'number') return discount
  const total = orderTotal(subtotal, delivery, discount)
  if (total === null) return bad('discount', 'The discount is bigger than the order.')

  const status = (draft.status === '' ? 'NEW' : draft.status) as OrderStatus
  if (!ORDER_STATUSES.includes(status)) return bad('status', 'Status: choose one.')
  if (status === 'DELIVERED' && total <= 0) return bad('subtotal', 'A delivered order needs a total above 0.')

  let deliveryDate: string | undefined
  if (draft.deliveredOn.trim() !== '') {
    const iso = parseDateInput(draft.deliveredOn)
    if (!iso) return bad('deliveredOn', 'Delivered on: use a date like 12 Oct 2026.')
    const late = futureDateError(iso)
    if (late) return bad('deliveredOn', late)
    deliveryDate = iso
  } else if (status === 'DELIVERED') {
    deliveryDate = today
  }

  const items = draft.items.trim()
  const notes = draft.notes.trim()
  const payment = draft.payment.trim()
  if (items.length > MAX_ITEMS) return bad('items', `Items: too long (max ${MAX_ITEMS} characters).`)
  if (notes.length > MAX_NOTES) return bad('notes', `Notes: too long (max ${MAX_NOTES} characters).`)
  if (payment.length > MAX_PAYMENT) return bad('payment', `Payment: too long (max ${MAX_PAYMENT} characters).`)

  return {
    ok: true,
    input: {
      orderDate: date,
      customerName: customer,
      customerPhone: phone === '' ? null : phone,
      items: items === '' ? null : items,
      subtotal,
      deliveryCharge: delivery,
      discount,
      paymentMethod: payment === '' ? null : payment,
      postingRule: draft.fund === 'DEDUCT_FROM_FUND' ? 'DEDUCT_FROM_FUND' : 'MONEY_IN',
      deliveryDate: deliveryDate ?? null,
      notes: notes === '' ? null : notes,
      status,
    },
  }
}
