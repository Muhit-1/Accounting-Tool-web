import type * as Xlsx from 'xlsx'
import { parseDateInput } from '../grid-parse'
import { excelSerialToIso, MAX_SHEET_ROWS, MAX_SHEETS, readDelimitedFile } from '../workbook'

// Reads a workbook with its formulas, as TEXT: nothing is calculated here. A cell keeps the value the file
// saved (the "cached" value) and, when it has one, the formula that made it.

export interface XCell {
  // text, a number, a ready ISO date (isDate), true/false, or null for an empty cell or an error value
  v: string | number | boolean | null
  // the formula without the leading =
  f?: string
  isDate?: boolean
  // the cell shows an error such as #DIV/0!
  error?: boolean
  // how the number is shown (currency, percent …), when the file says
  fmt?: string
}

export interface XSheet {
  name: string
  hidden: boolean
  rows: (XCell | undefined)[][]
  width: number
}

export type XReadResult = { ok: true; sheets: XSheet[]; formulaCount: number } | { ok: false; message: string }

const MAX_FORMULA_CHARS = 2000
const MAX_COLUMNS = 200

interface RawCell {
  t?: string
  v?: unknown
  f?: string
  F?: string
  z?: string | number
}

function convert(XLSX: typeof Xlsx, cell: RawCell | undefined, date1904: boolean): XCell | undefined {
  if (!cell) return undefined
  const f = typeof cell.f === 'string' && cell.f.length <= MAX_FORMULA_CHARS ? cell.f : undefined
  // an array formula covers several cells at once; it is read as values only
  const out: XCell = { v: null }
  if (typeof cell.z === 'string' && cell.z !== 'General') out.fmt = cell.z
  if (cell.t === 'e') out.error = true
  else if (cell.v === undefined || cell.v === null || cell.v === '') out.v = null
  else if (cell.t === 'b') out.v = Boolean(cell.v)
  else if (cell.t === 'd' && cell.v instanceof Date) {
    out.v = cell.v.toISOString().slice(0, 10)
    out.isDate = true
  } else if (cell.t === 'n' && typeof cell.v === 'number') {
    if (typeof cell.z === 'string' && XLSX.SSF.is_date(cell.z)) {
      const iso = excelSerialToIso(cell.v, date1904)
      if (iso) {
        out.v = iso
        out.isDate = true
      } else out.v = Number(cell.v.toPrecision(15))
    } else out.v = Number(cell.v.toPrecision(15))
  } else out.v = String(cell.v).trim()
  if (f !== undefined && !cell.F) out.f = f
  if (out.v === null && out.f === undefined && !out.error) return undefined
  return out
}

export function readXl(XLSX: typeof Xlsx, bytes: Uint8Array): XReadResult {
  let workbook: Xlsx.WorkBook
  try {
    workbook = XLSX.read(bytes, { type: 'array', dense: true, cellFormula: true, cellNF: true, cellStyles: false, cellHTML: false, bookVBA: false, sheetRows: MAX_SHEET_ROWS + 1 })
  } catch {
    return { ok: false, message: "That file couldn't be read. Is it a real .xlsx file?" }
  }
  if (workbook.SheetNames.length > MAX_SHEETS) return { ok: false, message: `That workbook has more than ${MAX_SHEETS} sheets.` }
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904)
  const hiddenFlags = workbook.Workbook?.Sheets ?? []
  const sheets: XSheet[] = []
  let formulaCount = 0
  for (const [index, name] of workbook.SheetNames.entries()) {
    const ws = workbook.Sheets[name] as Xlsx.WorkSheet & { '!data'?: (RawCell | undefined)[][]; '!fullref'?: string }
    if (ws['!fullref']) return { ok: false, message: `The sheet “${name}” has more than ${MAX_SHEET_ROWS.toLocaleString('en-US')} rows.` }
    const data = ws['!data'] ?? []
    let width = 0
    const rows = data.map((line) => {
      if (!line) return []
      const cells = Array.from({ length: Math.min(line.length, MAX_COLUMNS) }, (_, c) => convert(XLSX, line[c], date1904))
      while (cells.length > 0 && cells[cells.length - 1] === undefined) cells.pop()
      for (const c of cells) if (c?.f) formulaCount++
      width = Math.max(width, cells.length)
      return cells
    })
    sheets.push({ name, hidden: Boolean(hiddenFlags[index]?.Hidden), rows, width })
  }
  return { ok: true, sheets, formulaCount }
}

// A CSV / TSV file is one sheet of plain values: numbers and dates are told apart by how they look.
export function readCsv(text: string, fileName: string): XReadResult {
  const result = readDelimitedFile(text, fileName)
  if (!result.ok) return result
  const sheets = result.sheets.map((grid): XSheet => {
    let width = 0
    const rows = grid.rows.map((row) => {
      const cells = row.cells.map((raw): XCell | undefined => {
        const t = raw.trim()
        if (t === '') return undefined
        if (/^-?\d{1,3}(,\d{3})*(\.\d+)?$|^-?\d+(\.\d+)?$/.test(t)) return { v: Number(t.replace(/,/g, '')) }
        const iso = parseDateInput(t)
        return iso ? { v: iso, isDate: true } : { v: t }
      })
      width = Math.max(width, cells.length)
      return cells
    })
    return { name: grid.name, hidden: false, rows, width }
  })
  return { ok: true, sheets, formulaCount: 0 }
}
