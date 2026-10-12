import { describe, expect, it } from 'vitest'
import { compareValues, searchRows, sortRows, sumMoney } from './grid-rows'

describe('compareValues', () => {
  it('orders numbers by size, not as text', () => {
    expect(compareValues(9, 10)).toBeLessThan(0)
  })
  it('orders text naturally and ignoring case', () => {
    expect(compareValues('Order 2', 'Order 10')).toBeLessThan(0)
    expect(compareValues('apple', 'Banana')).toBeLessThan(0)
  })
  it('puts false before true', () => {
    expect(compareValues(false, true)).toBeLessThan(0)
  })
})

describe('sortRows', () => {
  const rows = [{ n: 3 }, { n: 1 }, { n: null }, { n: 2 }, { n: 1 }]

  it('sorts ascending and descending with blanks always last', () => {
    expect(sortRows(rows, (r) => r.n, 1).map((r) => r.n)).toEqual([1, 1, 2, 3, null])
    expect(sortRows(rows, (r) => r.n, -1).map((r) => r.n)).toEqual([3, 2, 1, 1, null])
  })

  it('is stable for equal values', () => {
    const tagged = [
      { k: 'a', id: 1 },
      { k: 'a', id: 2 },
      { k: 'a', id: 3 },
    ]
    expect(sortRows(tagged, (r) => r.k, -1).map((r) => r.id)).toEqual([1, 2, 3])
  })

  it('does not change the input', () => {
    const copy = [...rows]
    sortRows(rows, (r) => r.n, 1)
    expect(rows).toEqual(copy)
  })
})

describe('searchRows', () => {
  const rows = ['Bought the product', 'Transportation', 'Payment for boosting']
  it('matches part of the text, ignoring case', () => {
    expect(searchRows(rows, 'PRODUCT', (r) => r)).toEqual(['Bought the product'])
  })
  it('returns everything for an empty search', () => {
    expect(searchRows(rows, '   ', (r) => r)).toBe(rows)
  })
})

describe('sumMoney', () => {
  it('adds in whole cents', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3)
    expect(sumMoney([5000, 15000, 5500, 1768, 6500, 898, 10000, 2200, 100])).toBe(46966)
  })
  it('skips blanks', () => {
    expect(sumMoney([null, undefined, 5, Number.NaN])).toBe(5)
    expect(sumMoney([])).toBe(0)
  })
})
