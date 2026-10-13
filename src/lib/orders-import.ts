// Paste / import rules for Orders: one row of cells becomes one order, or a
// plain-words reason why not. The server numbers the orders, cleans the phone
// numbers, works out the totals and checks everything again.
import { futureDateError, parseDateInput, parseMoneyInput } from './grid-parse'
import { sumMoney } from './grid-rows'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, orderTotal, type OrderStatus } from './order-status'
import { MAX_CUSTOMER, MAX_ITEMS, MAX_NOTES, MAX_PAYMENT, MAX_PHONE } from './orders-grid'
import type { BulkOrderRow } from './orders'
import { countKeys, type ImportTarget, type MoneyTotals, type RowCheck } from './paste-import'
import type { ImportTableInfo } from './sheet-import'
import type { Order } from '../types/api'

export const ORDER_TARGETS: ImportTarget[] = [
  { id: 'orderDate', label: 'Order date', synonyms: ['date', 'ordered on'] },
  { id: 'customer', label: 'Customer', synonyms: ['customer name', 'name', 'client'] },
  { id: 'phone', label: 'Phone', synonyms: ['phone number', 'mobile', 'contact'] },
  { id: 'email', label: 'Email', synonyms: ['email optional', 'e-mail'] },
  { id: 'address', label: 'Address', synonyms: ['delivery address'] },
  { id: 'items', label: 'Items', synonyms: ['items ordered', 'products', 'item'] },
  { id: 'subtotal', label: 'Subtotal', synonyms: ['items subtotal bdt', 'items subtotal', 'price'] },
  { id: 'delivery', label: 'Delivery', synonyms: ['delivery charge bdt', 'delivery charge', 'shipping'] },
  { id: 'discount', label: 'Discount', synonyms: ['discount bdt'] },
  { id: 'payment', label: 'Payment', synonyms: ['payment method'] },
  { id: 'status', label: 'Status' },
  { id: 'fund', label: 'Fund treatment', synonyms: ['treatment'] },
  { id: 'deliveredOn', label: 'Delivered on', synonyms: ['delivery date', 'delivered date'] },
  { id: 'notes', label: 'Notes', synonyms: ['note', 'remarks'] },
]

export const ORDERS_TABLE: ImportTableInfo = {
  key: 'orders',
  label: 'Orders',
  targets: ORDER_TARGETS,
  nameHint: /order/i,
  isMatch: (matched) => matched.has('customer') && (matched.has('orderDate') || matched.has('subtotal') || matched.has('items')),
}

export interface OrderImportRow {
  order: BulkOrderRow
  // What the order is worth (subtotal + delivery - discount), the server's figure.
  total: number
  // Delivered orders post to the Cash book: money in, or out when deducted from the fund.
  posts: 'in' | 'out' | null
}

const lower = (text: string) => text.trim().toLowerCase()

// "Delivered", "delivered", "" (pending, as the old sheet does) -> the status.
export function parseStatus(text: string): OrderStatus | null {
  const value = lower(text)
  if (value === '' || value === 'pending') return 'NEW'
  return ORDER_STATUSES.find((status) => lower(ORDER_STATUS_LABEL[status]) === value || status.toLowerCase() === value) ?? null
}

export function parseFundTreatment(text: string): 'MONEY_IN' | 'DEDUCT_FROM_FUND' | null {
  const value = lower(text)
  if (value === '' || value === 'money in' || value === 'in') return 'MONEY_IN'
  if (value === 'deduct from fund' || value === 'deduct' || value === 'money out') return 'DEDUCT_FROM_FUND'
  return null
}

// The same order again: same day, customer and total.
export function orderKey(date: string, customer: string, total: number): string {
  return `${date}|${lower(customer)}|${total.toFixed(2)}`
}

export function existingOrderKeys(orders: Order[]): Map<string, number> {
  return countKeys(orders.map((order) => orderKey(order.orderDate.slice(0, 10), order.customerName, order.total)))
}

export function checkOrderRows(list: Record<string, string>[]): { check: RowCheck<OrderImportRow>; key: string | null }[] {
  return list.map((values) => {
    const fail = (message: string) => ({ check: { status: 'error', message } as RowCheck<OrderImportRow>, key: null })

    const orderDate = parseDateInput(values.orderDate ?? '')
    if (!orderDate) return fail('Order date: use a date like 12 Oct 2026.')
    const future = futureDateError(orderDate)
    if (future) return fail(future)

    const customer = (values.customer ?? '').trim()
    if (customer === '') return fail('Customer: type a name.')
    if (customer.length > MAX_CUSTOMER) return fail(`Customer: too long (max ${MAX_CUSTOMER} characters).`)

    const phone = (values.phone ?? '').trim()
    if (phone.length > MAX_PHONE || (phone !== '' && !/^[0-9+\-\s().]+$/.test(phone))) return fail('Phone: digits, spaces and + - ( ) . only.')

    const email = (values.email ?? '').trim()
    if (email !== '' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail('Email: that does not look like an email address.')
    if (email.length > 254) return fail('Email: too long.')

    const address = (values.address ?? '').trim()
    if (address.length > 500) return fail('Address: too long (max 500 characters).')
    const items = (values.items ?? '').trim()
    if (items.length > MAX_ITEMS) return fail(`Items: too long (max ${MAX_ITEMS} characters).`)
    const notes = (values.notes ?? '').trim()
    if (notes.length > MAX_NOTES) return fail(`Notes: too long (max ${MAX_NOTES} characters).`)
    const payment = (values.payment ?? '').trim()
    if (payment.length > MAX_PAYMENT) return fail(`Payment: too long (max ${MAX_PAYMENT} characters).`)

    const money = (key: 'subtotal' | 'delivery' | 'discount', label: string): number | string => {
      const parsed = parseMoneyInput(values[key] ?? '')
      if (parsed.kind === 'error') return `${label}: ${parsed.message}`
      if (parsed.kind === 'empty' && key === 'subtotal') return 'Subtotal: type a number, like 1,250.'
      return parsed.kind === 'ok' ? parsed.value : 0
    }
    const subtotal = money('subtotal', 'Subtotal')
    if (typeof subtotal === 'string') return fail(subtotal)
    const delivery = money('delivery', 'Delivery')
    if (typeof delivery === 'string') return fail(delivery)
    const discount = money('discount', 'Discount')
    if (typeof discount === 'string') return fail(discount)
    const total = orderTotal(subtotal, delivery, discount)
    if (total === null) return fail('The discount is bigger than the order.')

    const status = parseStatus(values.status ?? '')
    if (!status) return fail(`Status: “${(values.status ?? '').trim()}” is not one of ${ORDER_STATUSES.map((s) => ORDER_STATUS_LABEL[s]).join(', ')}.`)
    const fund = parseFundTreatment(values.fund ?? '')
    if (!fund) return fail('Fund treatment: use “Money in” or “Deduct from fund”.')
    if (status === 'DELIVERED' && total <= 0) return fail('A delivered order needs a total above 0.')

    // No delivery date: the server counts a delivered order on its order date, as the old sheet does.
    let deliveryDate: string | null = null
    if ((values.deliveredOn ?? '').trim() !== '') {
      const iso = parseDateInput(values.deliveredOn ?? '')
      if (!iso) return fail('Delivered on: use a date like 12 Oct 2026.')
      const late = futureDateError(iso)
      if (late) return fail(late)
      deliveryDate = iso
    }

    const order: BulkOrderRow = {
      orderDate,
      customerName: customer,
      customerPhone: phone === '' ? null : phone,
      customerEmail: email === '' ? null : email,
      customerAddress: address === '' ? null : address,
      items: items === '' ? null : items,
      subtotal,
      deliveryCharge: delivery,
      discount,
      paymentMethod: payment === '' ? null : payment,
      status,
      postingRule: fund,
      deliveryDate,
      notes: notes === '' ? null : notes,
    }
    return {
      check: { status: 'ok', row: { order, total, posts: status === 'DELIVERED' ? (fund === 'MONEY_IN' ? 'in' : 'out') : null } },
      key: orderKey(orderDate, customer, total),
    }
  })
}

// What the orders would move in the Cash book: only delivered ones post.
export function orderCashbookTotals(rows: OrderImportRow[]): MoneyTotals {
  return {
    moneyIn: sumMoney(rows.filter((row) => row.posts === 'in').map((row) => row.total)),
    moneyOut: sumMoney(rows.filter((row) => row.posts === 'out').map((row) => row.total)),
  }
}

export function summarizeOrderRows(rows: OrderImportRow[]): string {
  const posted = rows.filter((row) => row.posts !== null).length
  return `${posted} delivered (posted to the Cash book), ${rows.length - posted} not yet`
}
