import { colLetters, type XNode } from './xl-formula'

// Rebuilds an Excel formula in our own language: cell addresses become column names
// (`E2-F2` → `{Subtotal} - {Discount}`), ranges become columns (`SUM(E2:E50)` → `SUM({Subtotal})`),
// other sheets become other tables (`Costs!G:G` → `Costs[Total]`). Anything that cannot be said
// with column names (a single loose cell, another row, a lookup) is refused with the reason,
// and that column keeps its values instead.

export interface TableRegion {
  name: string
  sheet: string
  headerRow: number
  firstRow: number
  lastRow: number
  // sheet column → the name of the column in the table
  cols: Map<number, string>
}

export interface TranslateEnv {
  tables: TableRegion[]
  // `${table}|${column}` (lower case) → the words that stand for "nobody" in a column that became a link
  linkBlanks: Map<string, string[]>
}

export interface Origin {
  sheet: string
  row: number
  col: number
  table: TableRegion | null
  // 'row' = a formula in a data row (works on its own row); 'column' = a function row under the table
  mode: 'row' | 'column'
}

export type TResult = { ok: true; formula: string } | { ok: false; reason: string }

class Refused extends Error {}
const refuse = (reason: string): never => {
  throw new Refused(reason)
}

const DIRECT = new Set([
  'SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'PRODUCT', 'ROUND', 'ABS', 'FLOOR', 'CEILING', 'MOD', 'IF', 'IFS', 'SWITCH', 'AND', 'OR', 'NOT', 'IFERROR', 'ISBLANK',
  'SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF', 'CONCAT', 'LEFT', 'RIGHT', 'MID', 'UPPER', 'LOWER', 'TRIM', 'LEN', 'TEXT', 'TODAY', 'DATE', 'YEAR', 'MONTH', 'DAY', 'DAYS', 'EOMONTH',
])
const ALIASES: Record<string, string> = { CONCATENATE: 'CONCAT' }
const LIST_FUNCTIONS = new Set(['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'COUNTA', 'PRODUCT', 'CONCAT'])
const NOT_SUPPORTED_WORDS: Record<string, string> = {
  VLOOKUP: 'a lookup (VLOOKUP)', HLOOKUP: 'a lookup (HLOOKUP)', XLOOKUP: 'a lookup (XLOOKUP)', INDEX: 'INDEX', MATCH: 'MATCH', INDIRECT: 'INDIRECT', OFFSET: 'OFFSET', SUMPRODUCT: 'SUMPRODUCT',
  NOW: 'NOW()', ROW: 'ROW()', COLUMN: 'COLUMN()', FILTER: 'FILTER', QUERY: 'QUERY (Google Sheets)', ARRAYFORMULA: 'ARRAYFORMULA', IMPORTRANGE: 'IMPORTRANGE', VALUE: 'VALUE', ISNUMBER: 'ISNUMBER', ISTEXT: 'ISTEXT',
}

const quote = (name: string) => (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) ? name : `'${name}'`)
const lower = (s: string) => s.trim().toLowerCase()
const addr = (c: number, r: number | null) => `${colLetters(c)}${r === null ? '' : r + 1}`

function locate(env: TranslateEnv, sheet: string, col: number): TableRegion | undefined {
  return env.tables.find((t) => t.sheet === sheet && t.cols.has(col))
}

export function translate(node: XNode, origin: Origin, env: TranslateEnv): TResult {
  try {
    return { ok: true, formula: emit(node, origin, env) as string }
  } catch (e) {
    if (e instanceof Refused) return { ok: false, reason: e.message }
    throw e
  }
}

function emitRef(node: Extract<XNode, { t: 'ref' }>, origin: Origin, env: TranslateEnv, expand: boolean): string | string[] {
  const sheet = node.sheet ?? origin.sheet
  const t = locate(env, sheet, node.c1)
  const where = `${node.sheet ? node.sheet + '!' : ''}${addr(node.c1, node.r1)}${node.kind === 'cell' ? '' : ':' + addr(node.c2, node.r2)}`
  if (node.kind === 'cell') {
    if (!t) return refuse(`uses a cell outside the tables (${where})`)
    const r = node.r1 as number
    const field = t.cols.get(node.c1) as string
    if (r === t.headerRow) return `"${field.replace(/"/g, '""')}"` // a column heading used as a word, as in a crosstab
    if (r < t.firstRow || r > t.lastRow) return refuse(`uses a cell outside the rows of ${t.name} (${where})`)
    if (t === origin.table && origin.mode === 'row' && r === origin.row) return `{${field}}`
    if (t === origin.table && origin.mode === 'row') return refuse('uses another row of the same table (a running total or "previous row")')
    return refuse(`uses one single cell of ${t.name} (${where}); our formulas work on whole columns`)
  }
  // a range of cells
  if (node.c1 !== node.c2) {
    if (node.kind === 'range' && node.r1 === node.r2 && origin.mode === 'row' && node.r1 === origin.row && origin.table && sheet === origin.sheet) {
      const names: string[] = []
      for (let c = node.c1; c <= node.c2; c++) {
        const own = origin.table.cols.get(c)
        if (!own) return refuse(`uses a range that reaches outside the table (${where})`)
        names.push(`{${own}}`)
      }
      if (!expand) return refuse(`uses a row range (${where}) outside a SUM or similar`)
      return names
    }
    return refuse(`uses a block of several columns (${where})`)
  }
  if (!t) return refuse(`uses columns outside the tables (${where})`)
  if (node.kind === 'range') {
    const lo = Math.min(node.r1 as number, node.r2 as number)
    const hi = Math.max(node.r1 as number, node.r2 as number)
    if (hi < t.firstRow || lo > t.lastRow) return refuse(`uses rows outside ${t.name} (${where})`)
  }
  const field = t.cols.get(node.c1) as string
  if (t === origin.table && origin.mode === 'column') return `{${field}}`
  return `${quote(t.name)}[${field}]`
}

// "Not paid yet" in a column that became a link means "nobody": compare with empty text instead.
function blankLiteral(a: XNode, b: XNode, origin: Origin, env: TranslateEnv): string | null {
  const [refNode, strNode] = a.t === 'ref' ? [a, b] : b.t === 'ref' ? [b, a] : [null, null]
  if (!refNode || refNode.t !== 'ref' || !strNode || strNode.t !== 'str' || refNode.kind !== 'cell') return null
  const t = locate(env, refNode.sheet ?? origin.sheet, refNode.c1)
  const field = t?.cols.get(refNode.c1)
  if (!t || !field) return null
  const markers = env.linkBlanks.get(`${lower(t.name)}|${lower(field)}`)
  return markers?.some((m) => lower(m) === lower(strNode.v)) ? '""' : null
}

function emit(node: XNode, origin: Origin, env: TranslateEnv, expand = false): string | string[] {
  switch (node.t) {
    case 'num':
      return String(node.v)
    case 'str':
      return `"${node.v.replace(/"/g, '""')}"`
    case 'bool':
      return node.v ? 'TRUE' : 'FALSE'
    case 'name':
      return refuse(`uses the name “${node.v}”`)
    case 'ref':
      return emitRef(node, origin, env, expand)
    case 'neg':
      return `-${child(node.a, origin, env, 5, false)}`
    case 'pct':
      return `${child(node.a, origin, env, 5, false)}%`
    case 'bin': {
      let left: string
      let right: string
      const prec = PREC[node.op]
      if (node.op === '=' || node.op === '<>') {
        const blank = blankLiteral(node.a, node.b, origin, env)
        left = blank !== null && node.a.t === 'str' ? blank : child(node.a, origin, env, prec, false)
        right = blank !== null && node.b.t === 'str' ? blank : child(node.b, origin, env, prec, true)
      } else {
        left = child(node.a, origin, env, prec, false)
        right = child(node.b, origin, env, prec, true)
      }
      return `${left} ${node.op} ${right}`
    }
    case 'call': {
      const name = ALIASES[node.name] ?? node.name
      if (NOT_SUPPORTED_WORDS[node.name]) return refuse(`uses ${NOT_SUPPORTED_WORDS[node.name]}`)
      if (!DIRECT.has(name)) return refuse(`uses ${node.name}, which is not available yet`)
      const parts: string[] = []
      for (const arg of node.args) {
        const v = emit(arg, origin, env, LIST_FUNCTIONS.has(name))
        if (Array.isArray(v)) parts.push(...v)
        else parts.push(v)
      }
      return `${name}(${parts.join(', ')})`
    }
  }
}

const PREC: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 }

// A part of an operation, in brackets only when the order of the sums needs them.
function child(node: XNode, origin: Origin, env: TranslateEnv, parentPrec: number, isRight: boolean): string {
  const text = emit(node, origin, env) as string
  if (node.t !== 'bin') return text
  const prec = PREC[node.op]
  const needs = prec < parentPrec || (prec === parentPrec && isRight && node.op !== '+' && node.op !== '*' && node.op !== '&') || (prec === parentPrec && !isRight && node.op === '^')
  return needs ? `(${text})` : text
}
