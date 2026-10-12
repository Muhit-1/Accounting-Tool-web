import { describe, expect, it } from 'vitest'
import { summarizeSelection, type SelectableRow } from './selection'

const out = (amount: number): SelectableRow => ({ type: 'EXPENSE', amount })
const inn = (amount: number): SelectableRow => ({ type: 'INCOME', amount })

describe('summarizeSelection', () => {
  it('has nothing to show for an empty selection', () => {
    expect(summarizeSelection([])).toEqual({
      count: 0,
      kind: null,
      sum: null,
      average: null,
      min: null,
      max: null,
    })
  })

  it('gives count, sum, average, min and max (checked by hand: 250 + 500 + 300)', () => {
    const result = summarizeSelection([out(250), out(500), out(300)])
    expect(result).toEqual({ count: 3, kind: 'out', sum: 1050, average: 350, min: 250, max: 500 })
  })

  it('works for one row', () => {
    expect(summarizeSelection([inn(42.5)])).toEqual({ count: 1, kind: 'in', sum: 42.5, average: 42.5, min: 42.5, max: 42.5 })
  })

  it('shows plain amounts when only money in is ticked', () => {
    const result = summarizeSelection([inn(100), inn(300)])
    expect(result).toMatchObject({ kind: 'in', sum: 400, average: 200, min: 100, max: 300 })
  })

  it('shows plain amounts when only money out is ticked', () => {
    const result = summarizeSelection([out(100), out(300)])
    expect(result).toMatchObject({ kind: 'out', sum: 400, min: 100, max: 300 })
  })

  it('uses signed amounts and a net sum when money in and out are mixed', () => {
    const result = summarizeSelection([inn(1000), out(250), out(100)])
    expect(result).toEqual({ count: 3, kind: 'mixed', sum: 650, average: 216.67, min: -250, max: 1000 })
  })

  it('a mixed selection can have a negative net', () => {
    expect(summarizeSelection([inn(50), out(200)])).toMatchObject({ kind: 'mixed', sum: -150, average: -75 })
  })

  it('has no float drift with decimals (0.1 + 0.2)', () => {
    expect(summarizeSelection([out(0.1), out(0.2)])).toMatchObject({ sum: 0.3, average: 0.15 })
    expect(summarizeSelection([out(0.1), out(0.2), out(0.3)]).sum).toBe(0.6)
  })

  it('rounds the average to whole cents', () => {
    expect(summarizeSelection([out(1), out(1), out(2)]).average).toBe(1.33)
    expect(summarizeSelection([out(1), out(2)]).average).toBe(1.5)
    expect(summarizeSelection([out(0.01), out(0.02)]).average).toBe(0.02) // 0.015 -> 0.02
  })

  it('stays exact over many rows', () => {
    const rows = Array.from({ length: 1000 }, () => out(0.1))
    expect(summarizeSelection(rows)).toMatchObject({ count: 1000, sum: 100, average: 0.1 })
  })

  it('treats a row with no type like the table does: as money out', () => {
    expect(summarizeSelection([{ type: null, amount: 5 }, out(5)])).toMatchObject({ kind: 'out', sum: 10 })
  })
})
