// Pure order rules for the screens. The API enforces all of them
// (accounting-api/src/order/order-status.ts and OrderService); this only
// offers sensible choices and shows the same total the server will work out.
export const ORDER_STATUSES = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export type OrderPostingRule = 'MONEY_IN' | 'DEDUCT_FROM_FUND'

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  NEW: 'New',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
}

export const POSTING_RULE_LABEL: Record<OrderPostingRule, string> = {
  MONEY_IN: 'Money in',
  DEDUCT_FROM_FUND: 'Deduct from fund',
}

// The steps shown as a progress strip; cancelled and returned are ways out of it.
export const STATUS_STEPS: OrderStatus[] = ['NEW', 'CONFIRMED', 'SHIPPED', 'DELIVERED']

// Mirrors ALLOWED_ORDER_TRANSITIONS in the API; keep both in step.
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['SHIPPED', 'RETURNED'],
  CANCELLED: [],
  RETURNED: [],
}

export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return NEXT[current]
}

// The usual next click: new -> confirmed -> shipped -> delivered.
export function forwardStep(current: OrderStatus): OrderStatus | null {
  return current === 'NEW' ? 'CONFIRMED' : current === 'CONFIRMED' ? 'SHIPPED' : current === 'SHIPPED' ? 'DELIVERED' : null
}

export const isOrderFinal = (status: OrderStatus) => status === 'CANCELLED' || status === 'RETURNED'
// A delivered order owns a fund entry, so it has to be moved out of Delivered first.
export const isOrderDeletable = (status: OrderStatus) => status !== 'DELIVERED'
export const isOrderInProgress = (status: OrderStatus) => status === 'NEW' || status === 'CONFIRMED' || status === 'SHIPPED'

const toCents = (value: number) => Math.round(value * 100)

// subtotal + delivery charge - discount in whole cents; the same figure the
// server saves. null when the discount is bigger than the rest.
export function orderTotal(subtotal: number, deliveryCharge: number, discount: number): number | null {
  const cents = toCents(subtotal) + toCents(deliveryCharge) - toCents(discount)
  return cents < 0 ? null : cents / 100
}

// What an order means for the fund, in a few words.
export function fundEffect(status: OrderStatus, postingRule: OrderPostingRule): { text: string; tone: 'in' | 'out' | 'quiet' } {
  if (status === 'DELIVERED') {
    return postingRule === 'MONEY_IN' ? { text: 'Money in', tone: 'in' } : { text: 'Deducted', tone: 'out' }
  }
  if (isOrderFinal(status)) return { text: 'Not counted', tone: 'quiet' }
  return { text: 'Pending delivery', tone: 'quiet' }
}
