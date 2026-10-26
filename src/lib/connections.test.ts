import { describe, expect, it } from 'vitest'
import { buildMap, edgeEnds, BOX_H, BOX_W } from './connections'
import type { EngineTable, TableField } from '../types/engine'

const f = (id: string, name: string, type: TableField['type'], config: Record<string, unknown> = {}): TableField => ({ id, name, type, config, position: 0, locked: false })
const table = (id: string, name: string, kind: EngineTable['kind'], fields: TableField[], rules: EngineTable['rules'] = []): EngineTable => ({ id, name, kind, color: null, position: 0, templateKey: null, rowCount: 3, canEdit: true, canDesign: true, fnRows: [], fields, views: [], rules })

const ledger = table('cb', 'Cash book', 'LEDGER', [])
const partners = table('p', 'Partners', 'TABLE', [f('pn', 'Name', 'TEXT')])
const costs = table('c', 'Costs', 'TABLE', [f('by', 'Paid by', 'LINK', { targetTableId: 'p' }), f('t', 'Total', 'FORMULA')], [
  { id: 'r1', enabled: true, config: { amountFieldId: 't', dateFieldId: null, direction: 'OUT', conditions: [{ fieldId: 'by', op: 'eq', value: 'Business money' }], category: '', description: '' } },
])
const orders = table('o', 'Orders', 'TABLE', [f('st', 'Status', 'CHOICE')], [
  { id: 'r2', enabled: true, config: { amountFieldId: 't', dateFieldId: null, direction: 'IN', conditions: [], category: '', description: '' } },
  { id: 'r3', enabled: false, config: { amountFieldId: 't', dateFieldId: null, direction: 'IN', conditions: [], category: '', description: '' } },
])

describe('buildMap', () => {
  const map = buildMap([ledger, partners, costs, orders])
  it('puts the Cash book in the middle, sources left and link targets right', () => {
    const at = (id: string) => map.nodes.find((n) => n.id === id)!
    expect(at('cb').x).toBe(300)
    expect(at('c').x).toBe(40)
    expect(at('o').x).toBe(40)
    expect(at('p').x).toBe(560)
    expect(at('c').y).not.toBe(at('o').y)
  })
  it('draws one arrow per link column and per switched-on rule', () => {
    expect(map.edges.map((e) => `${e.kind}:${e.from}>${e.to}:${e.label}`).sort()).toEqual(['link:c>p:Paid by', 'post:c>cb:Paid by = Business money', 'post:o>cb:every row'])
  })
  it('a map without a Cash book or links is just boxes', () => {
    const plain = buildMap([partners])
    expect(plain.edges).toEqual([])
    expect(plain.nodes).toHaveLength(1)
    expect(plain.height).toBeGreaterThan(100)
  })
  it('keeps the boxes small', () => {
    expect(BOX_W).toBeLessThanOrEqual(160)
    expect(BOX_H).toBeLessThanOrEqual(60)
  })
})

describe('edgeEnds', () => {
  it('starts and ends on the borders of the boxes', () => {
    const a = { id: 'a', name: 'A', color: '', ledger: false, rows: 0, columns: 0, x: 0, y: 0 }
    const b = { ...a, id: 'b', x: 400, y: 0 }
    const e = edgeEnds(a, b)
    expect(e.x1).toBeCloseTo(BOX_W + 4)
    expect(e.x2).toBeCloseTo(400 - 4)
    expect(e.y1).toBeCloseTo(BOX_H / 2)
  })
})
