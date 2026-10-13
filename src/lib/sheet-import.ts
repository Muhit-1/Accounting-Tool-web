// From a sheet of a workbook to rows for a table: which sheet is which table,
// which of its columns go where, and each row's values. Pure; the screen only
// shows the choices and lets the person change them.
import { matchHeaders, normalizeHeader, type ImportTarget } from './paste-import'
import { skipReason, type Segment, type SheetGrid } from './sheet-segments'

// Not columns: what the heading above a block says about the rows in it.
export const SECTION_DIRECTION = '__dir'
export const SECTION_CATEGORY = '__section'

export interface ImportTableInfo {
  key: string
  label: string
  targets: ImportTarget[]
  // Does a header row that matched these columns look like this table?
  isMatch: (matched: ReadonlySet<string>) => boolean
  // Words in a sheet's name that point at this table ("ledger", "cash", "fund").
  nameHint: RegExp
}

// Sheets the app builds for itself from other data: not worth importing.
const DERIVED_SHEET = /\b(monthly|owner|partner|summary|statement|guide|readme|instructions?|help|dashboard|chart)/i

export interface SheetGuess {
  tableKey: string | null
  // Why it was left out, when it was.
  reason?: string
}

export function guessTable(sheet: SheetGrid, segments: Segment[], tables: ImportTableInfo[]): SheetGuess {
  const named = (table: ImportTableInfo) => table.nameHint.test(sheet.name) || normalizeHeader(sheet.name) === normalizeHeader(table.label)
  const scored = tables
    .map((table) => {
      let best = 0
      for (const segment of segments) {
        if (segment.synthetic) continue
        const matched = new Set(matchHeaders(segment.headers, table.targets).filter((id): id is string => id !== null))
        if (table.isMatch(matched)) best = Math.max(best, matched.size)
      }
      return { table, score: best + (best > 0 && named(table) ? 1 : 0) }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  if (DERIVED_SHEET.test(sheet.name) && !(scored[0] && named(scored[0].table))) {
    return { tableKey: null, reason: 'Your sheet works this out itself' }
  }
  if (scored.length === 0) {
    const byName = tables.find(named)
    return byName && segments.length > 0 ? { tableKey: byName.key } : { tableKey: null, reason: "Doesn't look like a table here" }
  }
  return { tableKey: scored[0].table.key }
}

// Where each column of a sheet goes, by the header's words. A header that
// appears in several blocks is one choice. Only the target's own table counts.
export type ColumnMapping = Record<string, string | null>

export function guessMapping(segments: Segment[], targets: ImportTarget[]): ColumnMapping {
  const mapping: ColumnMapping = {}
  for (const segment of segments) {
    const ids = segment.synthetic ? segment.headers.map((_, index) => targets[index]?.id ?? null) : matchHeaders(segment.headers, targets)
    segment.headerKeys.forEach((key, index) => {
      if (!(key in mapping) || mapping[key] === null) mapping[key] = ids[index] ?? null
    })
  }
  // A target can only be fed by one column: keep the first, leave the rest unmatched.
  const used = new Set<string>()
  for (const key of Object.keys(mapping)) {
    const id = mapping[key]
    if (id === null) continue
    if (used.has(id)) mapping[key] = null
    else used.add(id)
  }
  return mapping
}

export interface ColumnChoice {
  key: string
  header: string
  example: string
  targetId: string | null
}

// The list shown in "match your columns": one line per distinct header.
export function columnChoices(segments: Segment[], mapping: ColumnMapping): ColumnChoice[] {
  const seen = new Set<string>()
  const choices: ColumnChoice[] = []
  for (const segment of segments) {
    segment.headerKeys.forEach((key, index) => {
      if (seen.has(key)) return
      const example = segment.rows.map((row) => row.cells[index] ?? '').find((cell) => cell !== '') ?? ''
      if (!segment.synthetic && segment.headers[index] === '' && example === '') return
      seen.add(key)
      choices.push({ key, header: segment.headers[index] || `Column ${index + 1}`, example, targetId: mapping[key] ?? null })
    })
  }
  return choices
}

export interface SourceRow {
  sheetName: string
  rowNumber: number
  values: Record<string, string>
  // Left out on purpose (the sheet works it out itself, or it is a total line).
  skip: string | null
}

const isHttps = (text: string) => /^https:\/\/\S+$/i.test(text)

// Every data row of the sheet as values by target id, using the chosen mapping.
// A "Proof" cell that is a link (its words are "View proof", its address is
// behind it) gives the address; one with neither a link nor an address gives nothing.
export function sourceRows(sheet: SheetGrid, segments: Segment[], mapping: ColumnMapping): SourceRow[] {
  const result: SourceRow[] = []
  for (const segment of segments) {
    for (const row of segment.rows) {
      const values: Record<string, string> = {}
      segment.headerKeys.forEach((key, index) => {
        const id = mapping[key]
        if (!id) return
        let text = row.cells[index] ?? ''
        if (id === 'proof') {
          const link = row.links[index]
          text = link && isHttps(link.trim()) ? link.trim() : isHttps(text) ? text : ''
        }
        values[id] = text
      })
      if (segment.direction) values[SECTION_DIRECTION] = segment.direction
      if (segment.heading) values[SECTION_CATEGORY] = segment.heading
      result.push({ sheetName: sheet.name, rowNumber: row.rowNumber, values, skip: skipReason(row) })
    }
  }
  return result
}
