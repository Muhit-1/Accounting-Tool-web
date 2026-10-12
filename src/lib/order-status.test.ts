import { describe, expect, it } from 'vitest'
import {
  ORDER_STATUSES,
  fundEffect,
  forwardStep,
  isOrderDeletable,
  isOrderFinal,
  isOrderInProgress,
  nextStatuses,
  orderTotal,
  type OrderStatus,
} from './order-status'

describe('order total (same figure the server saves)', () => {
  it('is subtotal + delivery - discount', () => {
    expect(orderTotal(850, 100, 50)).toBe(900)
    expect(orderTotal(1000, 0, 0)).toBe(1000)
  })

  it('has no float drift', () => {
    expect(orderTotal(0.1, 0.2, 0)).toBe(0.3)
    expect(orderTotal(1.1, 2.2, 0.3)).toBe(3)
  })

  it('can be exactly 0, and is null when the discount is too big', () => {
    expect(orderTotal(100, 0, 100)).toBe(0)
    expect(orderTotal(100, 10, 111)).toBeNull()
  })
})

describe('order status moves (mirror of the API table)', () => {
  it('offers the same moves as the server', () => {
    expect(nextStatuses('NEW')).toEqual(['CONFIRMED', 'CANCELLED'])
    expect(nextStatuses('CONFIRMED')).toEqual(['SHIPPED', 'CANCELLED'])
    expect(nextStatuses('SHIPPED')).toEqual(['DELIVERED', 'CANCELLED'])
    expect(nextStatuses('DELIVERED')).toEqual(['SHIPPED', 'RETURNED'])
    expect(nextStatuses('CANCELLED')).toEqual([])
    expect(nextStatuses('RETURNED')).toEqual([])
  })

  it('has one usual next click until delivered', () => {
    const forward: Record<OrderStatus, OrderStatus | null> = {
      NEW: 'CONFIRMED',
      CONFIRMED: 'SHIPPED',
      SHIPPED: 'DELIVERED',
      DELIVERED: null,
      CANCELLED: null,
      RETURNED: null,
    }
    for (const status of ORDER_STATUSES) expect(forwardStep(status)).toBe(forward[status])
  })

  it('every usual next click is an allowed move', () => {
    for (const status of ORDER_STATUSES) {
      const step = forwardStep(status)
      if (step) expect(nextStatuses(status)).toContain(step)
    }
  })

  it('knows which orders are closed, deletable and in progress', () => {
    expect(ORDER_STATUSES.filter(isOrderFinal)).toEqual(['CANCELLED', 'RETURNED'])
    expect(ORDER_STATUSES.filter((s) => !isOrderDeletable(s))).toEqual(['DELIVERED'])
    expect(ORDER_STATUSES.filter(isOrderInProgress)).toEqual(['NEW', 'CONFIRMED', 'SHIPPED'])
  })
})

describe('fund effect', () => {
  it('only a delivered order is money', () => {
    expect(fundEffect('DELIVERED', 'MONEY_IN')).toEqual({ text: 'Money in', tone: 'in' })
    expect(fundEffect('DELIVERED', 'DEDUCT_FROM_FUND')).toEqual({ text: 'Deducted', tone: 'out' })
    expect(fundEffect('SHIPPED', 'MONEY_IN').text).toBe('Pending delivery')
    expect(fundEffect('CANCELLED', 'MONEY_IN').text).toBe('Not counted')
    expect(fundEffect('RETURNED', 'DEDUCT_FROM_FUND').text).toBe('Not counted')
  })
})
