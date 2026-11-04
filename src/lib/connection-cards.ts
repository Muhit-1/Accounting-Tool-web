import type { EngineTable, TableField } from '../types/engine'

// The Connections map, as cards: every table is a card that lists its columns, and the arrows run from COLUMN to
// COLUMN (a link column to the table it points at, a look-up or roll-up from the column it reads, a posting amount
// to the Cash book's Money in or Money out). Pure layout, so it is tested without a browser.

export const CARD_W = 224
export const HEAD_H = 34
export const ROW_H = 25
export const MAX_ROWS = 12
const GAP_X = 190
const GAP_Y = 36

export type RowRole = 'none' | 'link' | 'derived' | 'post'
export interface CardRow {
  id: string
  name: string
  glyph: string
  role: RowRole
}
export interface CardNode {
  id: string
  name: string
  color: string
  ledger: boolean
  rows: number
  x: number
  y: number
  w: number
  h: number
  fields: CardRow[]
  // columns left out of the card to keep it short
  more: number
}
export type EdgeKind = 'link' | 'derived' | 'post'
export interface EdgeEnd {
  node: string
  // the column the arrow starts or ends at; null = the card's title
  row: string | null
}
export interface CardEdge {
  id: string
  kind: EdgeKind
  from: EdgeEnd
  to: EdgeEnd
  // The arrow in one plain sentence, shown on hover.
  sentence: string
  // A few words on the arrow itself.
  label: string
}
export interface CardMap {
  nodes: CardNode[]
  edges: CardEdge[]
  width: number
  height: number
}

const GLYPH: Record<string, string> = { TEXT: 'Aa', NUMBER: '123', MONEY: '0.0', DATE: '▦', CHOICE: '▾', TICK: '✓', AUTO: '#', LINK: '↗', LOOKUP: '⌕', ROLLUP: 'Σ', FORMULA: 'ƒ' }
const LEDGER_ROWS: CardRow[] = [
  { id: 'date', name: 'Date', glyph: '▦', role: 'none' },
  { id: 'memo', name: 'Description', glyph: 'Aa', role: 'none' },
  { id: 'in', name: 'Money in', glyph: '0.0', role: 'none' },
  { id: 'out', name: 'Money out', glyph: '0.0', role: 'none' },
  { id: 'bal', name: 'Balance', glyph: 'ƒ', role: 'none' },
]
const HOW: Record<string, string> = { sum: 'adds up', count: 'counts', avg: 'averages', min: 'takes the smallest of', max: 'takes the largest of' }

function postWhen(table: EngineTable, rule: EngineTable['rules'][number]): string {
  const c = rule.config.conditions[0]
  if (!c) return 'every row'
  const f = table.fields.find((x) => x.id === c.fieldId)
  const v = Array.isArray(c.value) ? c.value.join(', ') : String(c.value ?? '')
  const word = c.op === 'eq' ? 'is' : c.op === 'ne' ? 'is not' : c.op === 'notempty' ? 'is filled' : c.op === 'empty' ? 'is empty' : c.op
  return `${f?.name ?? 'a column'} ${word}${c.op === 'notempty' || c.op === 'empty' ? '' : ` ${v}`}`
}

const rank: Record<RowRole, number> = { none: 0, link: 1, derived: 2, post: 3 }

export function buildCardMap(tables: EngineTable[]): CardMap {
  const ledger = tables.find((t) => t.kind === 'LEDGER')
  const others = tables.filter((t) => t.kind !== 'LEDGER')
  const byId = new Map(tables.map((t) => [t.id, t]))
  const fieldOf = (t: EngineTable | undefined, id: unknown): TableField | undefined => t?.fields.find((f) => f.id === id)

  // ---- arrows
  const edges: CardEdge[] = []
  const roles = new Map<string, RowRole>() // "table|row" -> strongest role
  const mark = (node: string, row: string | null, role: RowRole) => {
    if (!row) return
    const key = `${node}|${row}`
    if (rank[role] > rank[roles.get(key) ?? 'none']) roles.set(key, role)
  }
  for (const t of others) {
    for (const f of t.fields) {
      if (f.type === 'LINK') {
        const target = byId.get(String(f.config.targetTableId))
        if (target && target.kind !== 'LEDGER') {
          edges.push({ id: `l-${f.id}`, kind: 'link', from: { node: t.id, row: f.id }, to: { node: target.id, row: null }, label: f.name, sentence: `${t.name} · ${f.name} links each row to a row of ${target.name}.` })
          mark(t.id, f.id, 'link')
        }
      } else if (f.type === 'LOOKUP') {
        const link = fieldOf(t, f.config.linkFieldId)
        const x = byId.get(String(link?.config.targetTableId))
        const src = fieldOf(x, f.config.fieldId)
        if (x && src) {
          edges.push({ id: `k-${f.id}`, kind: 'derived', from: { node: x.id, row: src.id }, to: { node: t.id, row: f.id }, label: f.name, sentence: `${t.name} · ${f.name} shows ${x.name} · ${src.name} of the linked row. Nobody types it.` })
          mark(x.id, src.id, 'derived')
          mark(t.id, f.id, 'derived')
        }
      } else if (f.type === 'ROLLUP') {
        const s = byId.get(String(f.config.sourceTableId))
        const src = fieldOf(s, f.config.fieldId)
        if (s && src) {
          edges.push({ id: `u-${f.id}`, kind: 'derived', from: { node: s.id, row: src.id }, to: { node: t.id, row: f.id }, label: f.name, sentence: `${t.name} · ${f.name} ${HOW[String(f.config.how ?? 'sum')] ?? 'adds up'} ${s.name} · ${src.name} for each row.` })
          mark(s.id, src.id, 'derived')
          mark(t.id, f.id, 'derived')
        }
      }
    }
    if (ledger) {
      for (const r of t.rules) {
        if (!r.enabled) continue
        const amount = fieldOf(t, r.config.amountFieldId)
        const into = r.config.direction === 'IN' ? 'in' : 'out'
        const when = postWhen(t, r)
        edges.push({
          id: `p-${r.id}`,
          kind: 'post',
          from: { node: t.id, row: amount?.id ?? null },
          to: { node: ledger.id, row: into },
          label: when,
          sentence: `${t.name} posts ${amount?.name ?? 'its amount'} to the Cash book as money ${into} when ${when}.`,
        })
        mark(t.id, amount?.id ?? null, 'post')
        mark(ledger.id, into, 'post')
      }
    }
  }

  // ---- cards
  const card = (t: EngineTable): CardNode => {
    const all: CardRow[] =
      t.kind === 'LEDGER'
        ? LEDGER_ROWS.map((r) => ({ ...r, role: roles.get(`${t.id}|${r.id}`) ?? 'none' }))
        : t.fields.map((f) => ({ id: f.id, name: f.name, glyph: GLYPH[f.type] ?? '', role: roles.get(`${t.id}|${f.id}`) ?? 'none' }))
    // a long table keeps its first columns and every column an arrow touches
    const shown: CardRow[] = []
    let more = 0
    for (const [i, r] of all.entries()) {
      if (i < MAX_ROWS || r.role !== 'none') shown.push(r)
      else more++
    }
    return { id: t.id, name: t.name, color: t.color ?? '#2457d6', ledger: t.kind === 'LEDGER', rows: t.rowCount, x: 0, y: 0, w: CARD_W, h: HEAD_H + (shown.length + (more > 0 ? 1 : 0)) * ROW_H + 8, fields: shown, more }
  }

  // sources on the left, the Cash book in the middle, the tables others link to on the right
  const targets = new Set(others.flatMap((t) => t.fields.filter((f) => f.type === 'LINK').map((f) => String(f.config.targetTableId))))
  const left = others.filter((t) => !targets.has(t.id)).map(card)
  const right = others.filter((t) => targets.has(t.id)).map(card)
  const middle = ledger ? [card(ledger)] : []
  const place = (list: CardNode[], x: number, y0: number) => {
    let y = y0
    for (const n of list) {
      n.x = x
      n.y = y
      y += n.h + GAP_Y
    }
    return y
  }
  const xMiddle = 40 + CARD_W + GAP_X
  const bottomL = place(left, 40, 40)
  const bottomM = place(middle, xMiddle, 40)
  const bottomR = place(right, xMiddle + CARD_W + GAP_X, 40)
  const nodes = [...left, ...middle, ...right]
  return { nodes, edges, width: xMiddle + CARD_W + GAP_X + CARD_W + 40, height: Math.max(bottomL, bottomM, bottomR, 200) }
}

/** The point where an arrow touches a card: on the side facing the other card, at the height of the column. */
export function anchorOf(node: CardNode, row: string | null, other: CardNode): { x: number; y: number } {
  const i = row ? node.fields.findIndex((f) => f.id === row) : -1
  const y = node.y + (i >= 0 ? HEAD_H + i * ROW_H + ROW_H / 2 : HEAD_H / 2)
  const toRight = other.x + other.w / 2 >= node.x + node.w / 2
  return { x: toRight ? node.x + node.w : node.x, y }
}

/** A smooth curve between two anchors (leaving sideways, arriving sideways). */
export function edgePath(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const dx = Math.max(50, Math.abs(b.x - a.x) / 2)
  const sign = b.x >= a.x ? 1 : -1
  return `M ${a.x} ${a.y} C ${a.x + sign * dx} ${a.y}, ${b.x - sign * dx} ${b.y}, ${b.x} ${b.y}`
}

/** The rows an arrow lights up on hover, as "node|row" keys (the card title counts as row null). */
export function edgeKeys(edge: CardEdge): string[] {
  return [`${edge.from.node}|${edge.from.row ?? ''}`, `${edge.to.node}|${edge.to.row ?? ''}`]
}
