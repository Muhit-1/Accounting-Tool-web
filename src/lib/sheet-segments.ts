// Reading a sheet that was not made for this app. Orders and Costs are plain
// tables (one header row, then rows). A ledger is often a stack of blocks:
//
//   1.  CLIENT MONEY RECEIVED   (money in)        <- heading
//   Date | Description | Proof | Amount (BDT)     <- header row
//   ... rows ...
//   2.  ORDERS   (money in)
//   Date | Description | ...
//
// The heading says which way the money goes and what to call the category, so
// the block's Amount column needs no sign and no category column.
import { parseDateInput } from './grid-parse'
import { matchHeaders, normalizeHeader, type ImportTarget } from './paste-import'

export interface SheetRow {
  cells: string[]
  // A hyperlink behind each cell ("View proof" -> its address), null when none.
  links: (string | null)[]
  // Position in the sheet, 1-based, as the person sees it in Excel.
  rowNumber: number
}

export interface SheetGrid {
  name: string
  rows: SheetRow[]
}

export interface Segment {
  // "Client money received" (cleaned up), or null for a plain table.
  heading: string | null
  // 'in' / 'out' when the heading says so.
  direction: 'in' | 'out' | null
  headers: string[]
  // A stable name for each column: the header's words, or col:N when it has none.
  headerKeys: string[]
  rows: SheetRow[]
  // True when the headers were made up (the sheet had no header row).
  synthetic: boolean
}

const hasText = (row: SheetRow) => row.cells.some((cell) => cell !== '')

// A heading is a short line that starts with words — a data row starts with a date or a number.
function looksLikeHeading(row: SheetRow): boolean {
  const filled = row.cells.filter((cell) => cell !== '')
  if (filled.length === 0 || filled.length > 3) return false
  const first = filled[0]
  return first.length > 2 && !/^-?[\d,.\s]+$/.test(first) && parseDateInput(first) === null
}

export function headerKey(header: string, index: number): string {
  return normalizeHeader(header) || `col:${index}`
}

// "1.  CLIENT MONEY RECEIVED   (money in)" -> in. Without the brackets, words
// like "received", "refund" or "purchase" give it away.
export function directionOfHeading(heading: string): 'in' | 'out' | null {
  const text = heading.toLowerCase()
  const bracket = text.match(/\(\s*money\s+(in|out)\s*\)/)
  if (bracket) return bracket[1] as 'in' | 'out'
  if (/\b(money in|income|received|receipts?|refunds?|sales)\b/.test(text)) return 'in'
  if (/\b(money out|expenses?|purchases?|overhead|costs?|paid|spend|spent)\b/.test(text)) return 'out'
  return null
}

// "1.  CLIENT MONEY RECEIVED   (money in)" -> "Client money received";
// "2.  ORDERS (money in) – one total for all delivered orders" -> "Orders".
export function categoryOfHeading(heading: string): string {
  let text = heading
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s[–—-]\s/)[0]
    .replace(/\s+/g, ' ')
    .trim()
  // ALL CAPS is a heading style, not the category's name.
  if (text !== '' && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    text = text.charAt(0) + text.slice(1).toLowerCase()
  }
  return text
}

// Rows the sheet works out by itself, which are not entries to bring over.
export function skipReason(row: SheetRow): string | null {
  const texts = row.cells.map((cell) => cell.trim().toLowerCase())
  if (texts.includes('automatic')) return 'Worked out by your sheet'
  const first = texts.find((cell) => cell !== '')
  if (first && /^(sub)?totals?\b/.test(first)) return 'A total line'
  return null
}

// What a table needs to find its header rows in a sheet.
export interface HeaderSpec {
  targets: ImportTarget[]
  // Do these matched columns make a header row of this table (a Cash book one has a Date and an amount)?
  isMatch: (matched: ReadonlySet<string>) => boolean
}

// Splits a sheet into its tables. A header row is one whose words name the
// columns of the table. The row above it, when it has text, is the heading.
export function segmentGrid(grid: SheetGrid, spec: HeaderSpec): Segment[] {
  const rows = grid.rows
  const headerAt: number[] = []
  rows.forEach((row, index) => {
    const matched = new Set(matchHeaders(row.cells, spec.targets).filter((id): id is string => id !== null))
    if (matched.size >= 2 && spec.isMatch(matched)) headerAt.push(index)
  })

  if (headerAt.length === 0) {
    const data = rows.filter(hasText)
    const width = Math.max(0, ...data.map((row) => row.cells.length))
    const headers = Array.from({ length: width }, (_, index) => `Column ${index + 1}`)
    return data.length === 0
      ? []
      : [{ heading: null, direction: null, headers, headerKeys: headers.map((_, index) => `col:${index}`), rows: data, synthetic: true }]
  }

  return headerAt.map((start, position) => {
    const next = headerAt[position + 1]
    // The next block's heading sits right above its header row; it is not data.
    const nextHeading = next !== undefined && next - 1 > start && looksLikeHeading(rows[next - 1]) ? next - 1 : next
    const end = nextHeading ?? rows.length
    const above = start > 0 ? rows[start - 1] : null
    const headingText = above && looksLikeHeading(above) && !headerAt.includes(start - 1) ? (above.cells.find((cell) => cell !== '') ?? null) : null
    const headers = rows[start].cells
    return {
      heading: headingText ? categoryOfHeading(headingText) || null : null,
      direction: headingText ? directionOfHeading(headingText) : null,
      headers,
      headerKeys: headers.map(headerKey),
      rows: rows.slice(start + 1, end).filter(hasText),
      synthetic: false,
    }
  })
}

// "TOTAL MONEY IN", "TOTAL MONEY OUT", "FUND BALANCE" with a number next to or
// under them: what the sheet itself says it adds up to, to compare with.
export interface FileTotals {
  moneyIn?: number
  moneyOut?: number
  balance?: number
}

function numberIn(text: string | undefined): number | null {
  if (text === undefined || text.trim() === '') return null
  const cleaned = text.replace(/[,\s]/g, '')
  return /^-?\d+(\.\d+)?$/.test(cleaned) ? Number(cleaned) : null
}

export function findFileTotals(rows: SheetRow[]): FileTotals {
  const totals: FileTotals = {}
  const wanted: [keyof FileTotals, RegExp][] = [
    ['moneyIn', /^total money in\b/i],
    ['moneyOut', /^total money out\b/i],
    ['balance', /^fund balance\b/i],
  ]
  rows.forEach((row, r) => {
    row.cells.forEach((cell, c) => {
      for (const [key, pattern] of wanted) {
        if (totals[key] !== undefined || !pattern.test(cell.trim())) continue
        // To the right on the same row first (a statement line), then straight below (a tile).
        let value: number | null = null
        for (let k = 1; k <= 5 && value === null; k += 1) value = numberIn(row.cells[c + k])
        for (let k = 1; k <= 2 && value === null; k += 1) value = numberIn(rows[r + k]?.cells[c])
        if (value !== null) totals[key] = value
      }
    })
  })
  return totals
}
