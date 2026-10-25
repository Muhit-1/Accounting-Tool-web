import type { EngineTable } from '../types/engine'

// The "Connections" picture: your tables as boxes, a blue arrow for every link column and a gold dashed
// arrow from every table that posts to the Cash book. Pure layout, so it is tested without a browser.

export const BOX_W = 190
export const BOX_H = 74

export interface MapNode {
  id: string
  name: string
  color: string
  ledger: boolean
  rows: number
  columns: number
  x: number
  y: number
}
export interface MapEdge {
  id: string
  from: string
  to: string
  kind: 'link' | 'post'
  label: string
}
export interface ConnectionMap {
  nodes: MapNode[]
  edges: MapEdge[]
  width: number
  height: number
}

function postLabel(table: EngineTable, rule: EngineTable['rules'][number]): string {
  const c = rule.config.conditions[0]
  if (!c) return 'every row'
  const f = table.fields.find((x) => x.id === c.fieldId)
  const v = Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')
  const word = c.op === 'eq' ? '=' : c.op === 'ne' ? '≠' : c.op === 'notempty' ? 'is filled' : c.op === 'empty' ? 'is empty' : c.op
  return `${f?.name ?? '…'} ${word}${c.op === 'notempty' || c.op === 'empty' ? '' : ` ${v}`}`
}

export function buildMap(tables: EngineTable[]): ConnectionMap {
  const ledger = tables.find((t) => t.kind === 'LEDGER')
  const others = tables.filter((t) => t.kind !== 'LEDGER')
  const targets = new Set(others.flatMap((t) => t.fields.filter((f) => f.type === 'LINK').map((f) => String(f.config.targetTableId))))
  // sources on the left, the Cash book in the middle (top), tables that others link to on the right
  const left = others.filter((t) => !targets.has(t.id))
  const right = others.filter((t) => targets.has(t.id))
  const make = (t: EngineTable, x: number, y: number): MapNode => ({
    id: t.id,
    name: t.name,
    color: t.color ?? '#2457d6',
    ledger: t.kind === 'LEDGER',
    rows: t.rowCount,
    columns: t.fields.length,
    x,
    y,
  })
  const nodes: MapNode[] = [
    ...left.map((t, i) => make(t, 30, 30 + i * 140)),
    ...right.map((t, i) => make(t, 660, 170 + i * 140)),
    ...(ledger ? [make(ledger, 345, 30)] : []),
  ]
  const ids = new Set(nodes.map((n) => n.id))
  const edges: MapEdge[] = []
  for (const t of others) {
    for (const f of t.fields) {
      if (f.type === 'LINK' && ids.has(String(f.config.targetTableId))) edges.push({ id: `l-${f.id}`, from: t.id, to: String(f.config.targetTableId), kind: 'link', label: f.name })
    }
    if (ledger) for (const r of t.rules) if (r.enabled) edges.push({ id: `p-${r.id}`, from: t.id, to: ledger.id, kind: 'post', label: postLabel(t, r) })
  }
  const rowsN = Math.max(left.length, right.length + 1, 2)
  return { nodes, edges, width: 880, height: 60 + rowsN * 140 }
}

// Where an arrow leaves one box and enters another: on their borders, not their centres.
export function edgeEnds(a: MapNode, b: MapNode, shift = 0): { x1: number; y1: number; x2: number; y2: number; mx: number; my: number } {
  const ax = a.x + BOX_W / 2
  const ay = a.y + BOX_H / 2
  const bx = b.x + BOX_W / 2
  const by = b.y + BOX_H / 2
  const dx = bx - ax
  const dy = by - ay
  const t = Math.min(dx ? (BOX_W / 2 + 4) / Math.abs(dx) : Infinity, dy ? (BOX_H / 2 + 4) / Math.abs(dy) : Infinity)
  return { x1: ax + dx * t, y1: ay + dy * t + shift, x2: bx - dx * t, y2: by - dy * t + shift, mx: (ax + bx) / 2, my: (ay + by) / 2 + shift }
}
