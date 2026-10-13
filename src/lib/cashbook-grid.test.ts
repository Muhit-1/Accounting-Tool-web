import { describe, expect, it } from 'vitest'
import {
  broughtForward,
  buildNewEntry,
  calculationChip,
  categoryChoices,
  closingBalance,
  isCalculated,
  moneyInOf,
  moneyOutOf,
  planCategoryEdit,
  planDateEdit,
  planMemoEdit,
  planMoneyEdit,
  planProofEdit,
  postedBy,
  type NewEntryDraft,
} from './cashbook-grid'
import type { Category, Transaction } from '../types/api'

const SALES: Category = { id: 'in1', businessId: 'b', name: 'Sales', type: 'INCOME', groupName: 'Income', isSystem: false, createdAt: '' }
const RENT: Category = { id: 'out1', businessId: 'b', name: 'Rent', type: 'EXPENSE', groupName: 'Overhead', isSystem: false, createdAt: '' }
const ORDERS_AUTO: Category = { id: 'sys1', businessId: 'b', name: 'Orders (auto)', type: 'INCOME', groupName: null, isSystem: true, createdAt: '' }
const CATS = [SALES, RENT, ORDERS_AUTO]

function tx(extra: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    accountId: 'a',
    date: '2026-05-11T00:00:00.000Z',
    memo: 'Payment',
    counterparty: null,
    receiptFileName: null,
    proofUrl: null,
    orderId: null,
    costItemId: null,
    amountType: null,
    amountInputs: null,
    amount: 5000,
    type: 'INCOME',
    category: SALES,
    createdAt: '',
    runningBalance: 5000,
    ...extra,
  }
}

describe('money columns', () => {
  it('puts an amount in exactly one column', () => {
    expect(moneyInOf(tx())).toBe(5000)
    expect(moneyOutOf(tx())).toBeNull()
    expect(moneyOutOf(tx({ type: 'EXPENSE' }))).toBe(5000)
    expect(moneyInOf(tx({ type: 'EXPENSE' }))).toBeNull()
  })
})

describe('calculated rows', () => {
  const calc = tx({ type: 'EXPENSE', amountType: 'MULTIPLY', amountInputs: [1000, 5], amount: 5000 })
  it('are locked and show their calculation', () => {
    expect(isCalculated(calc)).toBe(true)
    expect(calculationChip(calc)).toBe('1,000 × 5')
    expect(isCalculated(tx())).toBe(false)
    expect(calculationChip(tx())).toBeNull()
  })
  it('refuse typing over the amount', () => {
    expect(planMoneyEdit(calc, 'out', '6000')).toMatchObject({ kind: 'error' })
  })
  it('a FIXED type is not a calculation', () => {
    expect(isCalculated(tx({ amountType: 'FIXED', amountInputs: [1] }))).toBe(false)
  })
})

describe('postedBy', () => {
  it('names the table that posted an entry', () => {
    expect(postedBy(tx({ orderId: 'o1' }))).toEqual({ kind: 'order', label: 'Orders' })
    expect(postedBy(tx({ costItemId: 'c1' }))).toEqual({ kind: 'cost', label: 'Costs' })
    expect(postedBy(tx())).toBeNull()
  })
})

describe('categoryChoices', () => {
  it('leaves out system categories, except the row\'s own', () => {
    expect(categoryChoices(CATS).map((c) => c.label).sort()).toEqual(['Rent', 'Sales'])
    expect(categoryChoices(CATS).some((c) => c.label === 'Orders (auto)')).toBe(false)
    expect(categoryChoices(CATS, 'sys1').some((c) => c.label === 'Orders (auto)')).toBe(true)
  })
  it('carries the group and kind', () => {
    const rent = categoryChoices(CATS).find((c) => c.label === 'Rent')
    expect(rent).toMatchObject({ value: 'out1', group: 'Overhead', type: 'EXPENSE' })
  })
})

describe('broughtForward', () => {
  const a = tx({ id: 'a', amount: 5000, type: 'INCOME', runningBalance: 5000 })
  const b = tx({ id: 'b', amount: 4214.5, type: 'EXPENSE', runningBalance: 785.5 })
  const c = tx({ id: 'c', amount: 15000, type: 'INCOME', runningBalance: 15785.5 })
  it('is null when the view starts at the first entry', () => {
    expect(broughtForward([a, b, c], [a, b, c])).toBeNull()
    expect(broughtForward([], [])).toBeNull()
  })
  it('is the balance before the first row shown', () => {
    expect(broughtForward([a, b, c], [b, c])).toBe(5000)
    expect(broughtForward([a, b, c], [c])).toBe(785.5)
  })
  it('works for a money-out first row, in whole cents', () => {
    const x = tx({ id: 'x', amount: 0.1, type: 'EXPENSE', runningBalance: 0.2 })
    expect(broughtForward([a, x], [x])).toBe(0.3)
  })
})

describe('closingBalance', () => {
  it('is the last running balance', () => {
    expect(closingBalance([tx({ runningBalance: 1 }), tx({ runningBalance: 925 })])).toBe(925)
    expect(closingBalance([])).toBe(0)
  })
})

describe('planMoneyEdit', () => {
  it('changes the amount in the same column', () => {
    expect(planMoneyEdit(tx(), 'in', '1,250')).toEqual({ kind: 'patch', patch: { amount: 1250 } })
  })
  it('does nothing when the value did not change', () => {
    expect(planMoneyEdit(tx(), 'in', '5,000.00')).toEqual({ kind: 'noop' })
  })
  it('moves the entry when the other column is typed in, and asks for a new category', () => {
    const plan = planMoneyEdit(tx(), 'out', '700')
    expect(plan).toEqual({ kind: 'patch', patch: { type: 'EXPENSE', amount: 700 }, notice: 'Moved to money out. Pick a category for it.' })
  })
  it('moving to a column the category still fits needs no notice', () => {
    const plan = planMoneyEdit(tx({ category: null }), 'out', '700')
    expect(plan).toMatchObject({ kind: 'patch' })
    const keep = planMoneyEdit(tx({ type: 'EXPENSE', category: RENT }), 'in', '1')
    expect(keep).toMatchObject({ kind: 'patch', notice: 'Moved to money in. Pick a category for it.' })
  })
  it('refuses to empty the only amount, allows emptying the empty column', () => {
    expect(planMoneyEdit(tx(), 'in', '')).toMatchObject({ kind: 'error' })
    expect(planMoneyEdit(tx(), 'out', '')).toEqual({ kind: 'noop' })
  })
  it('refuses nonsense, zero and negatives', () => {
    expect(planMoneyEdit(tx(), 'in', 'abc')).toMatchObject({ kind: 'error' })
    expect(planMoneyEdit(tx(), 'in', '0')).toMatchObject({ kind: 'error', message: 'The amount must be more than 0.' })
    expect(planMoneyEdit(tx(), 'in', '-5')).toMatchObject({ kind: 'error' })
  })
})

describe('planCategoryEdit', () => {
  it('accepts a category of the right kind', () => {
    expect(planCategoryEdit(tx({ category: null }), 'in1', CATS)).toEqual({ kind: 'patch', patch: { categoryId: 'in1' } })
  })
  it('refuses the wrong kind with a plain message', () => {
    expect(planCategoryEdit(tx(), 'out1', CATS)).toEqual({ kind: 'error', message: 'That category is for money out.' })
    expect(planCategoryEdit(tx({ type: 'EXPENSE', category: RENT }), 'in1', CATS)).toEqual({ kind: 'error', message: 'That category is for money in.' })
  })
  it('does nothing for the same category and clears on empty', () => {
    expect(planCategoryEdit(tx(), 'in1', CATS)).toEqual({ kind: 'noop' })
    expect(planCategoryEdit(tx(), '', CATS)).toEqual({ kind: 'patch', patch: { categoryId: null } })
    expect(planCategoryEdit(tx({ category: null }), '', CATS)).toEqual({ kind: 'noop' })
  })
  it('refuses a category that is gone', () => {
    expect(planCategoryEdit(tx(), 'nope', CATS)).toMatchObject({ kind: 'error' })
  })
})

describe('planDateEdit / planMemoEdit / planProofEdit', () => {
  it('reads a date in any accepted form', () => {
    expect(planDateEdit(tx(), '12/05/2026')).toEqual({ kind: 'patch', patch: { date: '2026-05-12' } })
    expect(planDateEdit(tx(), '11 May 2026')).toEqual({ kind: 'noop' })
    expect(planDateEdit(tx(), '31 Feb 2026')).toMatchObject({ kind: 'error' })
  })
  it('trims and caps the description', () => {
    expect(planMemoEdit(tx(), '  Photos  ')).toEqual({ kind: 'patch', patch: { memo: 'Photos' } })
    expect(planMemoEdit(tx(), 'Payment')).toEqual({ kind: 'noop' })
    expect(planMemoEdit(tx(), 'x'.repeat(1001))).toMatchObject({ kind: 'error' })
  })
  it('accepts https links only, and empty clears', () => {
    expect(planProofEdit(tx(), 'https://drive.example.com/p1')).toEqual({ kind: 'patch', patch: { proofUrl: 'https://drive.example.com/p1' } })
    expect(planProofEdit(tx(), 'javascript:alert(1)')).toMatchObject({ kind: 'error' })
    expect(planProofEdit(tx(), 'http://x.test')).toMatchObject({ kind: 'error' })
    expect(planProofEdit(tx({ proofUrl: 'https://a.test' }), '')).toEqual({ kind: 'patch', patch: { proofUrl: null } })
    expect(planProofEdit(tx(), '')).toEqual({ kind: 'noop' })
  })
})

describe('buildNewEntry', () => {
  const draft = (extra: Partial<NewEntryDraft> = {}): NewEntryDraft => ({
    date: '12 May 2026',
    memo: ' Stickers ',
    categoryId: 'out1',
    moneyIn: '',
    moneyOut: '1,250',
    proofUrl: '',
    ...extra,
  })

  it('builds a money-out entry', () => {
    expect(buildNewEntry(draft(), CATS)).toEqual({
      ok: true,
      input: { date: '2026-05-12', type: 'EXPENSE', categoryId: 'out1', memo: 'Stickers', proofUrl: undefined, amount: 1250 },
    })
  })

  it('builds a money-in entry with a matching category', () => {
    const result = buildNewEntry(draft({ categoryId: 'in1', moneyIn: '500', moneyOut: '' }), CATS)
    expect(result).toMatchObject({ ok: true, input: { type: 'INCOME', amount: 500, categoryId: 'in1' } })
  })

  it('needs a category', () => {
    expect(buildNewEntry(draft({ categoryId: '' }), CATS)).toMatchObject({ ok: false, column: 'category', message: 'Category: choose one.' })
  })

  it('needs exactly one of Money in / Money out', () => {
    expect(buildNewEntry(draft({ moneyIn: '5' }), CATS)).toMatchObject({ ok: false, message: 'Fill only one of Money in or Money out.' })
    expect(buildNewEntry(draft({ moneyOut: '' }), CATS)).toMatchObject({ ok: false, message: 'Amount: fill Money in or Money out.' })
  })

  it('refuses a category of the other kind', () => {
    expect(buildNewEntry(draft({ categoryId: 'in1' }), CATS)).toEqual({ ok: false, column: 'category', message: 'That category is for money in.' })
  })

  it('refuses a bad date, a bad amount and a bad link, naming the column', () => {
    expect(buildNewEntry(draft({ date: 'soon' }), CATS)).toMatchObject({ ok: false, column: 'date' })
    expect(buildNewEntry(draft({ moneyOut: 'abc' }), CATS)).toMatchObject({ ok: false, column: 'moneyOut' })
    expect(buildNewEntry(draft({ moneyOut: '0' }), CATS)).toMatchObject({ ok: false, column: 'moneyOut' })
    expect(buildNewEntry(draft({ proofUrl: 'ftp://x' }), CATS)).toMatchObject({ ok: false, column: 'proof' })
  })

  it('sends the calculation boxes too, so the server can recompute', () => {
    const result = buildNewEntry(draft({ moneyOut: '5000', calc: { type: 'MULTIPLY', inputs: [1000, 5], amount: 5000 } }), CATS)
    expect(result).toMatchObject({ ok: true, input: { amountType: 'MULTIPLY', amountInputs: [1000, 5], amount: 5000, type: 'EXPENSE' } })
  })
})

describe('future dates', () => {
  it('are refused with the same words as the server', () => {
    expect(planDateEdit(tx(), '1 Jan 2099')).toEqual({ kind: 'error', message: "Entries can't be dated in the future." })
    const result = buildNewEntry({ date: '1 Jan 2099', memo: '', categoryId: 'out1', moneyIn: '', moneyOut: '5', proofUrl: '' }, CATS)
    expect(result).toEqual({ ok: false, column: 'date', message: "Entries can't be dated in the future." })
  })
})
