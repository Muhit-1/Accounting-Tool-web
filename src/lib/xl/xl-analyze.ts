import { parseExcel, refsOf, type XNode } from './xl-formula'
import { translate, type Origin, type TableRegion, type TranslateEnv } from './xl-translate'
import type { XCell, XSheet } from './read'

// Looks at every sheet of a workbook and decides what it is: a table (header row, rows, columns of a
// kind, columns that are formulas, function rows under it), a report built from other sheets, a ledger
// (handled by the Cash book import) or nothing worth importing. Pure; nothing is saved here.

export type ColType = 'TEXT' | 'NUMBER' | 'MONEY' | 'DATE' | 'CHOICE' | 'TICK' | 'AUTO' | 'LINK' | 'FORMULA'
export type CellValue = string | number | boolean | null

export interface AnalyzedColumn {
  key: string
  name: string
  col: number
  type: ColType
  options?: string[]
  prefix?: string
  formula?: string
  // the first Excel formula it came from, for the review screen
  formulaFrom?: string
  linkTo?: string
  // formulas were found but could not be rebuilt: the column keeps its values
  notConverted?: string
  // words that mean "nobody" in a column that became a link
  blankMarkers?: string[]
  formulaCells: number
}

export interface AnalyzedFnRow {
  label: string
  cells: Record<string, { fn: 'sum' | 'avg' | 'count' | 'min' | 'max' | 'formula'; formula?: string; from: string }>
  notes: string[]
}

// "Orders where Status is Delivered post to the Cash book", read from a ledger sheet's own formulas
export interface RuleProposal {
  amount: string
  date: string | null
  direction: 'IN' | 'OUT'
  when: { field: string; op: 'eq' | 'ne'; value: string }[]
  description: string
  // the ledger formula it was read from
  from: string
}

export interface AnalyzedTable {
  sheet: string
  name: string
  include: boolean
  // why it starts switched off, or what to know about it
  note?: string
  kind: 'table' | 'report' | 'made'
  region: TableRegion
  columns: AnalyzedColumn[]
  rows: Record<string, CellValue | string[]>[]
  expected: Record<string, CellValue[]>
  fnRows: AnalyzedFnRow[]
  formulaCells: number
  convertedCells: number
  rule?: RuleProposal
}

export interface Analysis {
  tables: AnalyzedTable[]
  skipped: { sheet: string; reason: string }[]
  ledgerSheets: string[]
  formulaCells: number
  convertedCells: number
}

const MAX_ROWS = 20_000
const BLANK_MARKER = /^(not paid( yet)?|none|n\/?a|nil|-|—|unpaid|pending|unassigned)$/i
const MONEY_HEADER = /amount|total|price|cost|rate|paid|balance|subtotal|discount|delivery charge|fee|salary|tax|income|expense|money|bdt|usd|eur|rent|dues|charge/i
const PEOPLE_HEADER = /\b(paid by|partner|owner|staff|assigned|assignee|client|customer|supplier|vendor|employee|member)\b/i
const CHOICE_HEADER = /status|stage|state|method|priority|category|group|kind|type|treatment/i
const TEXTY_NUMBER_HEADER = /phone|mobile|tel\b|zip|postal|nid|account|id\b|code|pin\b/i
const AGGREGATES = new Set(['SUM', 'AVERAGE', 'COUNT', 'COUNTA', 'MIN', 'MAX', 'SUMIF', 'SUMIFS', 'COUNTIF', 'COUNTIFS', 'AVERAGEIF'])
const SUMMARY_LABEL = /^(sub)?totals?\b|^grand total|^average\b|^still due\b|^due\b|^delivered\b|^count\b/i

const cellAt = (sheet: XSheet, r: number, c: number): XCell | undefined => sheet.rows[r]?.[c]
const isEmpty = (c: XCell | undefined) => !c || (c.v === null && !c.f)
const rowEmpty = (sheet: XSheet, r: number) => (sheet.rows[r] ?? []).every(isEmpty)
const text = (c: XCell | undefined) => (c && typeof c.v === 'string' ? c.v : '')
const lower = (s: string) => s.trim().toLowerCase()

export function sanitizeName(raw: string, fallback: string): string {
  const cleaned = raw.replace(/[{}[\]']/g, '').replace(/\s+/g, ' ').trim().slice(0, 60)
  return cleaned || fallback
}

function uniqueName(name: string, taken: Set<string>): string {
  let out = name
  for (let n = 2; taken.has(lower(out)); n++) out = `${name} ${n}`.slice(0, 60)
  taken.add(lower(out))
  return out
}

function isSummaryRow(sheet: XSheet, r: number): boolean {
  const row = sheet.rows[r] ?? []
  const first = row.find((c) => text(c) !== '')
  if (first && SUMMARY_LABEL.test(text(first))) return true
  let aggregates = 0
  let formulas = 0
  for (const c of row) {
    if (!c?.f) continue
    formulas++
    try {
      const n = parseExcel(c.f)
      // an aggregate of a column of THIS sheet (a total under a table); a SUMIFS over another sheet is a normal cell of a report
      const ownColumn = refsOf(n).some((x) => (x.sheet === null || x.sheet === sheet.name) && (x.kind === 'cols' || (x.kind === 'range' && x.c1 === x.c2 && x.r1 !== x.r2)))
      if (n.t === 'call' && AGGREGATES.has(n.name) && ownColumn) aggregates++
    } catch {
      /* not readable: not an aggregate */
    }
  }
  return formulas > 0 && aggregates >= Math.max(1, Math.ceil(formulas / 2))
}

// The header row: the first row of three or more words (at least two if the sheet is narrow), with rows below it.
function findHeader(sheet: XSheet): number {
  for (let r = 0; r < Math.min(sheet.rows.length, 40); r++) {
    const row = sheet.rows[r] ?? []
    const filled = row.filter((c) => !isEmpty(c))
    const words = filled.filter((c) => typeof c?.v === 'string' && text(c) !== '' && !c.f)
    const need = sheet.width <= 3 ? 2 : 3
    if (words.length >= need && words.length >= filled.length * 0.8 && r + 1 < sheet.rows.length) return r
  }
  return -1
}

interface Detected {
  region: TableRegion
  summary: number[]
  names: string[]
}

function detectRegion(sheet: XSheet, tableName: string, takenFields: Set<string>): Detected | null {
  const h = findHeader(sheet)
  if (h < 0) return null
  const row = sheet.rows[h] ?? []
  let first = -1
  let last = -1
  row.forEach((c, i) => {
    if (!isEmpty(c)) {
      if (first < 0) first = i
      last = i
    }
  })
  const cols = new Map<number, string>()
  const seen = new Set<string>()
  for (let c = first; c <= last; c++) {
    const raw = text(row[c])
    const name = uniqueName(sanitizeName(raw, `Column ${c - first + 1}`), seen)
    cols.set(c, name)
    takenFields.add(lower(name))
  }
  // rows: until an empty row or a summary row
  let end = h
  for (let r = h + 1; r < sheet.rows.length && r - h <= MAX_ROWS; r++) {
    if (rowEmpty(sheet, r) || isSummaryRow(sheet, r)) break
    end = r
  }
  // function rows: summary-like rows below the data (a few blank rows may separate them)
  const summary: number[] = []
  let blanks = 0
  for (let r = end + 1; r < sheet.rows.length && blanks < 3; r++) {
    if (rowEmpty(sheet, r)) {
      blanks++
      continue
    }
    blanks = 0
    if (isSummaryRow(sheet, r)) summary.push(r)
    else break
  }
  return { region: { name: tableName, sheet: sheet.name, headerRow: h, firstRow: h + 1, lastRow: end, cols }, summary, names: [...cols.values()] }
}

function distinct(values: CellValue[]): string[] {
  return [...new Set(values.filter((v) => v !== null && v !== '').map((v) => String(v)))]
}

interface TypeGuess {
  type: ColType
  options?: string[]
  prefix?: string
}

function guessType(header: string, cells: (XCell | undefined)[], position: number): TypeGuess {
  const values = cells.filter((c): c is XCell => !!c && c.v !== null).map((c) => c)
  const n = values.length
  if (n === 0) return { type: 'TEXT' }
  const dates = values.filter((c) => c.isDate).length
  if (dates >= n * 0.8) return { type: 'DATE' }
  const bools = values.filter((c) => typeof c.v === 'boolean' || (typeof c.v === 'string' && /^(true|false|yes|no|✓|✔|x)$/i.test(c.v))).length
  if (bools === n && n >= 1) return { type: 'TICK' }
  const nums = values.filter((c) => typeof c.v === 'number').length
  if (nums >= n * 0.8 && !TEXTY_NUMBER_HEADER.test(header)) {
    const fmt = values.find((c) => c.fmt)?.fmt ?? ''
    return { type: MONEY_HEADER.test(header) || /[$৳€£]|#,##0\.00/.test(fmt) ? 'MONEY' : 'NUMBER' }
  }
  // an auto number: "SJ-0002" style, or 1, 2, 3 under a header like "#" or "Order ID"
  if (position === 0 && /^(#|no\.?|id|number|sl\.?|serial|order (id|no\.?|number)|invoice (no\.?|number))$/i.test(header.trim())) {
    const strs = values.map((c) => String(c.v))
    const m = strs.map((s) => /^(\D*?)(\d+)$/.exec(s))
    if (m.every(Boolean) && new Set(m.map((x) => (x as RegExpExecArray)[1])).size === 1) return { type: 'AUTO', prefix: (m[0] as RegExpExecArray)[1].slice(0, 10) }
  }
  const strs = values.map((c) => String(c.v))
  const kinds = distinct(strs)
  if (kinds.length >= 1 && kinds.length <= 20 && strs.every((s) => s.length <= 40) && (CHOICE_HEADER.test(header) ? true : n >= 8 && kinds.length <= Math.max(2, n / 3))) {
    return { type: 'CHOICE', options: kinds.slice(0, 100) }
  }
  return { type: 'TEXT' }
}

function cachedValue(c: XCell | undefined, type: ColType): CellValue {
  if (!c || c.v === null) return null
  if (type === 'DATE') return typeof c.v === 'string' && c.isDate ? c.v : null
  if (type === 'NUMBER' || type === 'MONEY') return typeof c.v === 'number' ? c.v : null
  if (type === 'TICK') return typeof c.v === 'boolean' ? c.v : /^(true|yes|✓|✔|x)$/i.test(String(c.v))
  if (typeof c.v === 'boolean') return c.v ? 'Yes' : 'No'
  return String(c.v)
}

export interface AnalyzeOptions {
  ledgerSheets: string[]
}

export function analyzeWorkbook(sheets: XSheet[], options: AnalyzeOptions): Analysis {
  const skipped: Analysis['skipped'] = []
  const tableNames = new Set<string>()
  const detected: { sheet: XSheet; d: Detected; name: string }[] = []
  for (const sheet of sheets) {
    if (options.ledgerSheets.includes(sheet.name)) continue
    if (sheet.hidden) {
      skipped.push({ sheet: sheet.name, reason: 'Hidden sheet' })
      continue
    }
    const name = uniqueName(sanitizeName(sheet.name, 'Sheet'), tableNames)
    const d = detectRegion(sheet, name, new Set())
    if (!d) {
      skipped.push({ sheet: sheet.name, reason: 'No table found (no row of column names)' })
      tableNames.delete(lower(name))
      continue
    }
    detected.push({ sheet, d, name })
  }

  // ---- columns: type from the values, first pass (formulas are decided once every table is known)
  const tables: AnalyzedTable[] = detected.map(({ sheet, d, name }) => {
    const region = d.region
    const columns: AnalyzedColumn[] = []
    const rows: AnalyzedTable['rows'] = []
    let pos = 0
    for (const [col, colName] of region.cols) {
      const cells: (XCell | undefined)[] = []
      let formulaCells = 0
      for (let r = region.firstRow; r <= region.lastRow; r++) {
        const c = cellAt(sheet, r, col)
        cells.push(c)
        if (c?.f) formulaCells++
      }
      const guess = guessType(colName, cells, pos)
      columns.push({ key: `c${col}`, name: colName, col, type: guess.type, options: guess.options, prefix: guess.prefix, formulaCells })
      pos++
    }
    for (let r = region.firstRow; r <= region.lastRow; r++) {
      const out: Record<string, CellValue | string[]> = {}
      for (const column of columns) {
        const v = cachedValue(cellAt(sheet, r, column.col), column.type === 'AUTO' ? 'TEXT' : column.type)
        if (v !== null) out[column.key] = v
        if (column.type === 'AUTO') {
          const m = /(\d+)$/.exec(String(v ?? ''))
          if (m) out._number = Number(m[1])
          delete out[column.key]
        }
      }
      rows.push(out)
    }
    return { sheet: sheet.name, name, include: true, kind: 'table', region, columns, rows, expected: {}, fnRows: [], formulaCells: 0, convertedCells: 0 }
  })

  // ---- links: a column whose words are the names of another table's rows, or a column of people
  const blankKey = (t: AnalyzedTable, c: AnalyzedColumn) => `${lower(t.name)}|${lower(c.name)}`
  const linkBlanks: TranslateEnv['linkBlanks'] = new Map()
  const made: AnalyzedTable[] = []
  const primary = (t: AnalyzedTable) => t.columns.find((c) => c.type === 'TEXT' || c.type === 'CHOICE')
  for (const t of tables) {
    for (const [index, c] of t.columns.entries()) {
      if (index === 0 || !(c.type === 'TEXT' || c.type === 'CHOICE') || c.formulaCells > t.rows.length * 0.5) continue
      const all = t.rows.map((r) => r[c.key]).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
      const markers = distinct(all).filter((v) => BLANK_MARKER.test(v.trim()))
      const names = all.filter((v) => !BLANK_MARKER.test(v.trim()))
      if (names.length < 2) continue
      const target = tables.find((o) => {
        if (o === t || o.rows.length < 2) return false
        const p = primary(o)
        if (!p) return false
        const set = new Set(o.rows.map((r) => lower(String(r[p.key] ?? ''))))
        return names.filter((v) => set.has(lower(v))).length >= names.length * 0.9
      })
      if (target) {
        c.type = 'LINK'
        c.linkTo = target.name
        c.blankMarkers = markers
        linkBlanks.set(blankKey(t, c), markers)
        continue
      }
      const people = distinct(names)
      // customers and suppliers are a table only when the same names come back; "paid by" is a short list of people anyway
      const repeats = people.length <= names.length * 0.7
      const fewPeople = /paid by|partner|owner/i.test(c.name)
      if (PEOPLE_HEADER.test(c.name) && people.length >= 1 && people.length <= 20 && names.length >= 3 && (repeats || fewPeople)) {
        const wanted = /paid by|partner|owner/i.test(c.name) ? 'Partners' : /client|customer/i.test(c.name) ? 'Clients' : /supplier|vendor/i.test(c.name) ? 'Suppliers' : /staff|employee|assign/i.test(c.name) ? 'Staff' : /member/i.test(c.name) ? 'Members' : `${c.name}s`
        const name = uniqueName(sanitizeName(wanted, 'People'), tableNames)
        const region: TableRegion = { name, sheet: '', headerRow: -1, firstRow: 0, lastRow: people.length - 1, cols: new Map([[0, 'Name']]) }
        made.push({
          sheet: t.sheet,
          name,
          include: true,
          kind: 'made',
          note: `Made from the ${people.length} names in “${c.name}” of ${t.name}.`,
          region,
          columns: [{ key: 'name', name: 'Name', col: 0, type: 'TEXT', formulaCells: 0 }],
          rows: people.map((p) => ({ name: p })),
          expected: {},
          fnRows: [],
          formulaCells: 0,
          convertedCells: 0,
        })
        c.type = 'LINK'
        c.linkTo = name
        c.blankMarkers = markers
        linkBlanks.set(blankKey(t, c), markers)
      }
    }
  }

  // ---- formulas
  const env: TranslateEnv = { tables: [...tables.map((t) => t.region)], linkBlanks }
  let totalFormulas = 0
  let totalConverted = 0
  for (const [index, t] of tables.entries()) {
    const sheet = detected[index].sheet
    const region = t.region
    for (const c of t.columns) {
      if (c.formulaCells === 0) continue
      const dataRows = region.lastRow - region.firstRow + 1
      totalFormulas += c.formulaCells
      t.formulaCells += c.formulaCells
      if (c.type === 'AUTO') continue
      const results = new Map<string, number>()
      let firstReason = ''
      let firstFormula = ''
      let readable = 0
      for (let r = region.firstRow; r <= region.lastRow; r++) {
        const cell = cellAt(sheet, r, c.col)
        if (!cell?.f) continue
        if (!firstFormula) firstFormula = cell.f
        let result
        try {
          result = translate(parseExcel(cell.f), { sheet: sheet.name, row: r, col: c.col, table: region, mode: 'row' } satisfies Origin, env)
        } catch (e) {
          result = { ok: false as const, reason: e instanceof Error ? e.message : 'could not be read' }
        }
        if (result.ok) {
          readable++
          results.set(result.formula, (results.get(result.formula) ?? 0) + 1)
        } else if (!firstReason) firstReason = result.reason
      }
      const best = [...results.entries()].sort((a, b) => b[1] - a[1])[0]
      if (best && best[1] >= dataRows * 0.8 && c.type !== 'LINK') {
        c.type = 'FORMULA'
        c.formula = best[0]
        c.formulaFrom = firstFormula
        t.convertedCells += c.formulaCells
        totalConverted += c.formulaCells
        t.expected[c.key] = []
        for (let r = region.firstRow; r <= region.lastRow; r++) {
          const cell = cellAt(sheet, r, c.col)
          t.expected[c.key].push(cell?.v === undefined ? null : cell.v)
        }
        t.rows.forEach((row) => delete row[c.key])
        void readable
      } else if (c.formulaCells >= dataRows * 0.5) {
        c.notConverted = firstReason || (best ? 'the cells use different formulas' : 'could not be read')
        c.formulaFrom = firstFormula
      }
    }
    // function rows
    const detectedSummary = detected[index].d.summary
    for (const r of detectedSummary) {
      const row = sheet.rows[r] ?? []
      const label = text(row.find((c) => text(c) !== '' && !c?.f)) || 'Total'
      const fr: AnalyzedFnRow = { label: label.slice(0, 40), cells: {}, notes: [] }
      for (const c of t.columns) {
        const cell = row[c.col]
        if (!cell?.f) continue
        totalFormulas++
        t.formulaCells++
        let node: XNode
        try {
          node = parseExcel(cell.f)
        } catch (e) {
          fr.notes.push(`${c.name}: ${e instanceof Error ? e.message : 'could not be read'}`)
          continue
        }
        const res = translate(node, { sheet: sheet.name, row: r, col: c.col, table: region, mode: 'column' }, env)
        if (!res.ok) {
          fr.notes.push(`${c.name}: ${res.reason}`)
          continue
        }
        const simple = /^(SUM|AVERAGE|MIN|MAX|COUNT|COUNTA)\(\{([^{}]+)\}\)$/.exec(res.formula)
        const fn = simple && lower(simple[2]) === lower(c.name) ? ({ SUM: 'sum', AVERAGE: 'avg', MIN: 'min', MAX: 'max', COUNT: 'count', COUNTA: 'count' } as const)[simple[1] as 'SUM'] : null
        fr.cells[c.key] = fn ? { fn, from: cell.f } : { fn: 'formula', formula: res.formula, from: cell.f }
        t.convertedCells++
        totalConverted++
      }
      if (Object.keys(fr.cells).length || fr.notes.length) t.fnRows.push(fr)
    }
  }

  // ---- reports: sheets that are mostly formulas none of which could be rebuilt
  for (const t of tables) {
    const cellsTotal = Math.max(1, (t.region.lastRow - t.region.firstRow + 1) * Math.max(1, t.columns.length - 1))
    const unconverted = t.columns.filter((c) => c.notConverted).reduce((n, c) => n + c.formulaCells, 0)
    if (t.rows.length === 0) {
      t.include = false
      t.note = 'It has no rows yet.'
    } else if (unconverted / cellsTotal >= 0.4) {
      t.kind = 'report'
      t.include = false
      t.note = 'Looks like a report built from other sheets. Our Reports do this for you; import it as plain values only if you want to keep the numbers.'
    }
  }
  return { tables: [...tables, ...made], skipped, ledgerSheets: options.ledgerSheets, formulaCells: totalFormulas, convertedCells: totalConverted }
}
