import { describe, expect, it } from 'vitest'
import { PAID_BY_BUSINESS, PAID_BY_NONE, buildNewCost, costTotal, decodePaidBy, paidByChoices, paidByValue, planCostEdit, type NewCostDraft } from './costs-grid'
import type { CostItem } from '../types/api'

const PARTNERS = [
  { id: 'p1', name: 'Shahidul Alam' },
  { id: 'p2', name: 'Md Hifzur Rahman Sumon' },
]

function cost(extra: Partial<CostItem> = {}): CostItem {
  return {
    id: 'c1',
    number: 8,
    groupName: 'Overhead Cost',
    item: 'Rent + Utility',
    monthlyRate: 7500,
    months: 5,
    oneTime: 0,
    total: 37500,
    paidFrom: 'NONE',
    partnerId: null,
    partnerName: null,
    status: 'DUE',
    paidOn: null,
    startMonth: null,
    notes: null,
    transactionId: null,
    createdAt: '',
    updatedAt: '',
    ...extra,
  }
}

describe('costTotal', () => {
  it('is rate x months + one-time in whole cents, like the server', () => {
    expect(costTotal(7000, 7, 0)).toBe(49000)
    expect(costTotal(33.33, 3, 0)).toBe(99.99)
    expect(costTotal(0.1, 3, 0.2)).toBe(0.5)
    expect(costTotal(0, 0, 7000)).toBe(7000)
    expect(costTotal(1400, 5, 100)).toBe(7100)
  })
})

describe('Paid by', () => {
  it('offers Not paid yet, each partner, then Business money', () => {
    expect(paidByChoices(PARTNERS)).toEqual([
      { value: 'NONE', label: 'Not paid yet' },
      { value: 'P:p1', label: 'Shahidul Alam' },
      { value: 'P:p2', label: 'Md Hifzur Rahman Sumon' },
      { value: 'BUSINESS', label: 'Business money → Cash book' },
    ])
  })
  it('turns a cost into one value and back', () => {
    expect(paidByValue(cost())).toBe(PAID_BY_NONE)
    expect(paidByValue(cost({ paidFrom: 'BUSINESS' }))).toBe(PAID_BY_BUSINESS)
    expect(paidByValue(cost({ paidFrom: 'PARTNER', partnerId: 'p2' }))).toBe('P:p2')
    expect(decodePaidBy('P:p2', PARTNERS)).toEqual({ paidFrom: 'PARTNER', partnerId: 'p2' })
    expect(decodePaidBy('BUSINESS', PARTNERS)).toEqual({ paidFrom: 'BUSINESS', partnerId: null })
    expect(decodePaidBy('NONE', PARTNERS)).toEqual({ paidFrom: 'NONE', partnerId: null })
    expect(decodePaidBy('P:gone', PARTNERS)).toBeNull()
    expect(decodePaidBy('x', PARTNERS)).toBeNull()
  })
})

describe('planCostEdit', () => {
  it('saves text cells trimmed, an empty group is Other, an empty item is refused', () => {
    expect(planCostEdit(cost(), 'item', '  Rent  ', PARTNERS)).toEqual({ kind: 'patch', patch: { item: 'Rent' } })
    expect(planCostEdit(cost(), 'item', 'Rent + Utility', PARTNERS)).toEqual({ kind: 'noop' })
    expect(planCostEdit(cost(), 'item', ' ', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'group', '', PARTNERS)).toEqual({ kind: 'patch', patch: { groupName: 'Other' } })
    expect(planCostEdit(cost(), 'group', 'x'.repeat(61), PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'notes', 'May to Sep', PARTNERS)).toEqual({ kind: 'patch', patch: { notes: 'May to Sep' } })
  })

  it('changes the numbers, but never leaves a cost with no amount', () => {
    expect(planCostEdit(cost(), 'rate', '8,000', PARTNERS)).toEqual({ kind: 'patch', patch: { monthlyRate: 8000 } })
    expect(planCostEdit(cost(), 'months', '6', PARTNERS)).toEqual({ kind: 'patch', patch: { months: 6 } })
    expect(planCostEdit(cost(), 'months', '6.5', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'months', '601', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'oneTime', '1,000', PARTNERS)).toEqual({ kind: 'patch', patch: { oneTime: 1000 } })
    expect(planCostEdit(cost(), 'rate', '', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'months', '0', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost({ monthlyRate: 0, months: 0, oneTime: 500 }), 'oneTime', '', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'rate', 'abc', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost(), 'rate', '7,500', PARTNERS)).toEqual({ kind: 'noop' })
  })

  it('Paid by: business money posts, leaving it unposts, a partner posts nothing', () => {
    expect(planCostEdit(cost(), 'paidBy', 'BUSINESS', PARTNERS)).toEqual({
      kind: 'patch',
      patch: { paidFrom: 'BUSINESS', partnerId: null },
      notice: 'Posted to the Cash book as money out.',
    })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS' }), 'paidBy', 'P:p1', PARTNERS)).toEqual({
      kind: 'patch',
      patch: { paidFrom: 'PARTNER', partnerId: 'p1' },
      notice: 'Removed from the Cash book.',
    })
    expect(planCostEdit(cost({ paidFrom: 'PARTNER', partnerId: 'p1' }), 'paidBy', 'P:p2', PARTNERS)).toEqual({
      kind: 'patch',
      patch: { paidFrom: 'PARTNER', partnerId: 'p2' },
      notice: undefined,
    })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS' }), 'paidBy', 'NONE', PARTNERS)).toMatchObject({ notice: 'Removed from the Cash book.' })
    expect(planCostEdit(cost(), 'paidBy', 'NONE', PARTNERS)).toEqual({ kind: 'noop' })
    expect(planCostEdit(cost(), 'paidBy', 'P:gone', PARTNERS)).toMatchObject({ kind: 'error' })
  })

  it('Paid on only makes sense for a paid cost, and not in the future', () => {
    expect(planCostEdit(cost(), 'paidOn', '1 Oct 2026', PARTNERS)).toEqual({ kind: 'error', message: 'Choose who paid it first.' })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS' }), 'paidOn', '1 Oct 2026', PARTNERS)).toEqual({ kind: 'patch', patch: { paidOn: '2026-10-01' } })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS' }), 'paidOn', '1 Jan 2099', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS' }), 'paidOn', 'soon', PARTNERS)).toMatchObject({ kind: 'error' })
    expect(planCostEdit(cost({ paidFrom: 'BUSINESS', paidOn: '2026-10-01T00:00:00.000Z' }), 'paidOn', '1 Oct 2026', PARTNERS)).toEqual({ kind: 'noop' })
  })
})

describe('buildNewCost', () => {
  const draft = (extra: Partial<NewCostDraft> = {}): NewCostDraft => ({
    group: 'Overhead Cost',
    item: ' Internet ',
    rate: '1,200',
    months: '3',
    oneTime: '',
    paidBy: '',
    paidOn: '',
    notes: '',
    ...extra,
  })

  it('builds a cost: due by default, an empty group is Other', () => {
    expect(buildNewCost(draft(), PARTNERS)).toEqual({
      ok: true,
      input: { groupName: 'Overhead Cost', item: 'Internet', monthlyRate: 1200, months: 3, oneTime: 0, paidFrom: 'NONE', partnerId: null, paidOn: null, notes: null },
    })
    expect(buildNewCost(draft({ group: '' }), PARTNERS)).toMatchObject({ ok: true, input: { groupName: 'Other' } })
  })

  it('a one-time cost, paid from Business money on a day', () => {
    expect(buildNewCost(draft({ item: 'Shop sign', rate: '', months: '', oneTime: '4,500', paidBy: 'BUSINESS', paidOn: '1 Oct 2026' }), PARTNERS)).toMatchObject({
      ok: true,
      input: { oneTime: 4500, paidFrom: 'BUSINESS', paidOn: '2026-10-01' },
    })
  })

  it('names the column of every problem', () => {
    expect(buildNewCost(draft({ item: '' }), PARTNERS)).toMatchObject({ ok: false, column: 'item' })
    expect(buildNewCost(draft({ rate: '', months: '', oneTime: '' }), PARTNERS)).toMatchObject({ ok: false, column: 'oneTime' })
    expect(buildNewCost(draft({ rate: 'abc' }), PARTNERS)).toMatchObject({ ok: false, column: 'rate' })
    expect(buildNewCost(draft({ months: '1.5' }), PARTNERS)).toMatchObject({ ok: false, column: 'months' })
    expect(buildNewCost(draft({ paidBy: 'P:gone' }), PARTNERS)).toMatchObject({ ok: false, column: 'paidBy' })
    expect(buildNewCost(draft({ paidOn: '1 Oct 2026' }), PARTNERS)).toMatchObject({ ok: false, column: 'paidOn' })
    expect(buildNewCost(draft({ paidBy: 'P:p1', paidOn: 'x' }), PARTNERS)).toMatchObject({ ok: false, column: 'paidOn' })
  })
})
