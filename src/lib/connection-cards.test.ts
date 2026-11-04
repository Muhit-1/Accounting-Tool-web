import { describe, expect, it } from 'vitest'
import { anchorOf, buildCardMap, CARD_W, edgePath, HEAD_H, MAX_ROWS, ROW_H } from './connection-cards'
import type { EngineTable, TableField } from '../types/engine'

const f = (id: string, name: string, type: TableField['type'], config: Record<string, unknown> = {}): TableField => ({ id, name, type, config, position: 0, locked: false })
const table = (id: string, name: string, kind: EngineTable['kind'], fields: TableField[], rules: EngineTable['rules'] = []): EngineTable => ({ id, name, kind, color: null, position: 0, templateKey: null, rowCount: 3, canEdit: true, canDesign: true, fnRows: [], fields, views: [], rules })

const ledger = table('cb', 'Cash book', 'LEDGER', [])
const products = table('p', 'Products', 'TABLE', [f('pn', 'Product', 'TEXT'), f('pp', 'Price', 'MONEY'), f('ps', 'Sold', 'ROLLUP', { sourceTableId: 'o', viaFieldId: 'op', fieldId: 'oq', how: 'sum' })])
const orders = table(
  'o',
  'Orders',
  'TABLE',
  [f('op', 'Product', 'LINK', { targetTableId: 'p' }), f('opr', 'Price', 'LOOKUP', { linkFieldId: 'op', fieldId: 'pp' }), f('oq', 'Qty', 'NUMBER'), f('ot', 'Total', 'FORMULA'), f('os', 'Status', 'CHOICE')],
  [
    { id: 'r1', enabled: true, config: { amountFieldId: 'ot', dateFieldId: null, direction: 'IN', conditions: [{ fieldId: 'os', op: 'eq', value: 'Delivered' }], category: '', description: '' } },
    { id: 'r2', enabled: false, config: { amountFieldId: 'ot', dateFieldId: null, direction: 'OUT', conditions: [], category: '', description: '' } },
  ],
)
const map = buildCardMap([ledger, products, orders])
const at = (id: string) => map.nodes.find((n) => n.id === id)!

describe('buildCardMap layout', () => {
  it('puts the sources left, the Cash book in the middle and the link targets right', () => {
    expect(at('o').x).toBeLessThan(at('cb').x)
    expect(at('cb').x).toBeLessThan(at('p').x)
  })
  it('makes each card as tall as its columns', () => {
    expect(at('o').h).toBe(HEAD_H + 5 * ROW_H + 8)
    expect(at('cb').fields.map((r) => r.name)).toEqual(['Date', 'Description', 'Money in', 'Money out', 'Balance'])
    expect(at('o').w).toBe(CARD_W)
  })
  it('keeps the width and height around every card', () => {
    for (const n of map.nodes) {
      expect(n.x + n.w).toBeLessThanOrEqual(map.width)
      expect(n.y + n.h).toBeLessThanOrEqual(map.height)
    }
  })
})

describe('buildCardMap arrows', () => {
  const sentences = Object.fromEntries(map.edges.map((e) => [e.id, e]))
  it('has a link, a look-up, a roll-up and one post arrow (a switched-off rule has none)', () => {
    expect(map.edges.map((e) => `${e.kind}:${e.id}`).sort()).toEqual(['derived:k-opr', 'derived:u-ps', 'link:l-op', 'post:p-r1'])
  })
  it('runs from column to column', () => {
    expect(sentences['l-op'].from).toEqual({ node: 'o', row: 'op' })
    expect(sentences['l-op'].to).toEqual({ node: 'p', row: null })
    expect(sentences['k-opr'].from).toEqual({ node: 'p', row: 'pp' })
    expect(sentences['k-opr'].to).toEqual({ node: 'o', row: 'opr' })
    expect(sentences['u-ps'].from).toEqual({ node: 'o', row: 'oq' })
    expect(sentences['p-r1'].to).toEqual({ node: 'cb', row: 'in' })
  })
  it('says each arrow in a plain sentence', () => {
    expect(sentences['l-op'].sentence).toBe('Orders · Product links each row to a row of Products.')
    expect(sentences['k-opr'].sentence).toBe('Orders · Price shows Products · Price of the linked row. Nobody types it.')
    expect(sentences['u-ps'].sentence).toBe('Products · Sold adds up Orders · Qty for each row.')
    expect(sentences['p-r1'].sentence).toBe('Orders posts Total to the Cash book as money in when Status is Delivered.')
  })
  it('marks the columns an arrow touches', () => {
    const role = (n: string, r: string) => at(n).fields.find((x) => x.id === r)?.role
    expect(role('o', 'op')).toBe('link')
    expect(role('o', 'opr')).toBe('derived')
    expect(role('o', 'ot')).toBe('post')
    expect(role('cb', 'in')).toBe('post')
    expect(role('o', 'os')).toBe('none')
  })
  it('is just cards when there is no link and no Cash book', () => {
    const plain = buildCardMap([table('x', 'Notes', 'TABLE', [f('n', 'Note', 'TEXT')])])
    expect(plain.edges).toEqual([])
    expect(plain.nodes).toHaveLength(1)
  })
})

describe('long tables', () => {
  it('keep the first columns and every column an arrow touches', () => {
    const many = Array.from({ length: 20 }, (_, i) => f(`c${i}`, `Col ${i}`, 'TEXT'))
    many.push(f('lk', 'Late link', 'LINK', { targetTableId: 'p' }))
    const big = table('b', 'Big', 'TABLE', many)
    const m = buildCardMap([products, big])
    const n = m.nodes.find((x) => x.id === 'b')!
    expect(n.fields.length).toBe(MAX_ROWS + 1)
    expect(n.fields.some((r) => r.id === 'lk')).toBe(true)
    expect(n.more).toBe(21 - (MAX_ROWS + 1))
  })
})

describe('anchorOf and edgePath', () => {
  it('leaves on the side that faces the other card, at the height of the column', () => {
    const a = anchorOf(at('o'), 'oq', at('cb'))
    expect(a.x).toBe(at('o').x + at('o').w)
    expect(a.y).toBe(at('o').y + HEAD_H + 2 * ROW_H + ROW_H / 2)
    expect(anchorOf(at('p'), null, at('o')).x).toBe(at('p').x)
  })
  it('draws a smooth curve between two points', () => {
    expect(edgePath({ x: 0, y: 0 }, { x: 200, y: 100 })).toBe('M 0 0 C 100 0, 100 100, 200 100')
    expect(edgePath({ x: 200, y: 0 }, { x: 0, y: 0 })).toBe('M 200 0 C 100 0, 100 0, 0 0')
  })
})
