import { describe, expect, it } from 'vitest'
import { emptyColumnIds } from './empty-columns'

type Row = Record<string, unknown>
const col = (id: string, type = 'text', locked = false) => ({ id, type, locked, value: (r: Row) => r[id] })
const rows = (n: number, make: (i: number) => Row) => Array.from({ length: n }, (_, i) => make(i))

describe('emptyColumnIds', () => {
  const cols = [col('name'), col('phone'), col('notes'), col('paid', 'tick'), col('total', 'calc'), col('no', 'text', true), col('amt', 'money')]

  it('names the columns no row has a value in', () => {
    const r = rows(4, (i) => ({ name: `n${i}`, amt: 10, phone: '', notes: null }))
    expect(emptyColumnIds(cols, r)).toEqual(['phone', 'notes'])
  })
  it('one value anywhere keeps the column', () => {
    const r = rows(4, (i) => ({ name: `n${i}`, phone: i === 3 ? '017' : '', amt: 0 }))
    expect(emptyColumnIds(cols, r)).toEqual(['notes'])
  })
  it('zero and false are values; blank text is not', () => {
    const r = rows(3, () => ({ name: 'a', amt: 0, notes: '   ' }))
    expect(emptyColumnIds(cols, r)).toEqual(['phone', 'notes'])
  })
  it('never hides tick boxes, worked-out or locked columns', () => {
    const r = rows(5, () => ({}))
    expect(emptyColumnIds(cols, r)).toEqual(['name', 'phone', 'notes', 'amt'])
  })
  it('keeps the columns it is told to keep', () => {
    const r = rows(4, (i) => ({ name: `n${i}`, amt: 10 }))
    expect(emptyColumnIds(cols, r, ['notes'])).toEqual(['phone'])
  })
  it('hides nothing until the table has a few rows', () => {
    expect(emptyColumnIds(cols, rows(2, () => ({})))).toEqual([])
    expect(emptyColumnIds(cols, [])).toEqual([])
  })
})
