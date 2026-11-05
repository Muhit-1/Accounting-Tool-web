import { describe, expect, it } from 'vitest'
import { exampleRowFor } from './example-row'

const f = (id: string, type: string) => ({ id, name: id, type, config: {}, position: 0, locked: false })
const table = (fields: ReturnType<typeof f>[], templateKey: string | null = null) => ({ templateKey, fields }) as never
const TODAY = new Date('2026-11-06T10:00:00Z')

describe('exampleRowFor', () => {
  it('fills the starter table: a name, an amount and today', () => {
    expect(exampleRowFor(table([f('n', 'TEXT'), f('a', 'MONEY'), f('d', 'DATE')]), TODAY)).toEqual({ n: 'Tea and biscuit', a: '120.00', d: '6 Nov 2026' })
  })
  it('works with any of the three missing', () => {
    expect(exampleRowFor(table([f('n', 'TEXT')]), TODAY)).toEqual({ n: 'Tea and biscuit' })
    expect(exampleRowFor(table([f('n', 'TEXT'), f('q', 'NUMBER')]), TODAY)).toEqual({ n: 'Tea and biscuit', q: '120.00' })
  })
  it('is nothing for a template table, a big table, or one with worked-out columns', () => {
    expect(exampleRowFor(table([f('n', 'TEXT')], 'orders'), TODAY)).toBeNull()
    expect(exampleRowFor(table(Array.from({ length: 5 }, (_, i) => f(`c${i}`, 'TEXT'))), TODAY)).toBeNull()
    expect(exampleRowFor(table([f('n', 'TEXT'), f('x', 'FORMULA')]), TODAY)).toBeNull()
  })
  it('is nothing without a text column or without columns', () => {
    expect(exampleRowFor(table([f('a', 'MONEY')]), TODAY)).toBeNull()
    expect(exampleRowFor(table([]), TODAY)).toBeNull()
  })
})
