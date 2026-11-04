import { describe, expect, it } from 'vitest'
import type { EngineTable, TableField } from '../types/engine'
import { explainField, formulaParts, nameBoxText } from './formula-bar'

const field = (o: Partial<TableField> & { id: string; name: string; type: TableField['type'] }): TableField => ({ config: {}, position: 0, locked: false, ...o })
const table = (id: string, name: string, fields: TableField[]): EngineTable =>
  ({ id, name, kind: 'TABLE', color: null, position: 0, templateKey: null, rowCount: 0, canEdit: true, canDesign: true, fnRows: [], fields, views: [], rules: [] }) as EngineTable

describe('formulaParts', () => {
  it('makes chips of column names and reads * as ×', () => {
    expect(formulaParts('{Qty} * {Price}')).toEqual([
      { kind: 'ref', text: 'Qty' },
      { kind: 'text', text: ' × ' },
      { kind: 'ref', text: 'Price' },
    ])
  })
  it('keeps functions and numbers as text and knows other tables’ columns', () => {
    const parts = formulaParts('ROUND(SUM(Costs[Total]) / 2, 1)')
    expect(parts.map((p) => p.text).join('')).toBe('ROUND(SUM(Costs[Total]) ÷ 2, 1)'.replace('Costs[Total]', 'Costs[Total]'))
    expect(parts.find((p) => p.kind === 'ref')?.text).toBe('Costs[Total]')
  })
  it('turns comparison signs into readable ones', () => {
    expect(formulaParts('IF({A} <= 3, 1, 0)').some((p) => p.text.includes('≤'))).toBe(true)
  })
  it('returns one text part for a formula without names', () => {
    expect(formulaParts('1 + 2')).toEqual([{ kind: 'text', text: '1 + 2' }])
    expect(formulaParts('')).toEqual([])
  })
})

describe('explainField', () => {
  const products = table('p', 'Products', [field({ id: 'pn', name: 'Product', type: 'TEXT' }), field({ id: 'pp', name: 'Price', type: 'MONEY' })])
  const orders = table('o', 'Orders', [
    field({ id: 'op', name: 'Product', type: 'LINK', config: { targetTableId: 'p' } }),
    field({ id: 'oprice', name: 'Price', type: 'LOOKUP', config: { linkFieldId: 'op', fieldId: 'pp' } }),
    field({ id: 'ot', name: 'Total', type: 'FORMULA', config: { formula: '{Qty} * {Price}' } }),
    field({ id: 'on', name: 'No.', type: 'AUTO', config: { prefix: 'SJ-' } }),
    field({ id: 'oc', name: 'Customer', type: 'TEXT' }),
  ])
  const sold = field({ id: 'ps', name: 'Sold', type: 'ROLLUP', config: { sourceTableId: 'o', viaFieldId: 'op', fieldId: 'ot', how: 'sum' } })
  const all = [products, orders]

  it('explains a formula column with its parts', () => {
    const e = explainField(orders.fields[2], orders, all)
    expect(e.kind).toBe('formula')
    if (e.kind === 'formula') expect(e.parts).toHaveLength(3)
  })
  it('says where a look-up comes from and what a link points at', () => {
    expect(explainField(orders.fields[1], orders, all)).toEqual({ kind: 'note', text: 'Comes from Products · Price. Nobody types it here.' })
    expect(explainField(orders.fields[0], orders, all)).toEqual({ kind: 'note', text: 'Pick a row of Products.' })
  })
  it('says what a roll-up adds up', () => {
    expect(explainField(sold, products, all)).toEqual({ kind: 'note', text: 'Adds up Orders · Total for each row.' })
  })
  it('describes an auto number and leaves plain columns alone', () => {
    expect(explainField(orders.fields[3], orders, all)).toEqual({ kind: 'note', text: 'A number the sheet gives each row, like SJ-1.' })
    expect(explainField(orders.fields[4], orders, all)).toEqual({ kind: 'plain' })
  })
})

describe('nameBoxText', () => {
  it('names the column and the row', () => {
    expect(nameBoxText('Subtotal', 3)).toBe('Subtotal · row 3')
    expect(nameBoxText('Subtotal', null)).toBe('Subtotal · new row')
  })
})
