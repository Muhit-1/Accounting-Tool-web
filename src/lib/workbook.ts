// Reading a spreadsheet file in the browser. Nothing is sent anywhere here:
// the file is opened on this computer and only the checked rows are sent to
// the server later, through the same endpoints (and checks) as a paste.
//
// Safety rules, all enforced before or while reading:
//  - 5 MB, 20 sheets, a bounded number of rows per sheet;
//  - .xlsx / .csv / .tsv / .txt only (no .xlsm, .xlsb, .xls);
//  - a workbook with macros, an oversized zip or too many zip parts is refused
//    before the library ever sees it;
//  - cached values only: formulas are never read or evaluated, nothing is fetched.
import type * as Xlsx from 'xlsx'
import { parseDelimited } from './paste-import'
import type { SheetGrid, SheetRow } from './sheet-segments'

export const MAX_FILE_BYTES = 5 * 1024 * 1024
export const MAX_SHEETS = 20
// Rows read per sheet. Blocks and blank lines count too, so this is above the 1000-rows-per-table limit.
export const MAX_SHEET_ROWS = 3000
export const MAX_UNZIPPED_BYTES = 100 * 1024 * 1024
export const MAX_ZIP_PARTS = 300

const ALLOWED_EXTENSIONS = ['xlsx', 'csv', 'tsv', 'txt']

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export interface ZipPart {
  name: string
  // Size once unpacked; Infinity when the zip64 field says "see the extra block" (too big to trust).
  size: number
}

// The parts of a zip file, read from its table of contents (central
// directory) without unpacking anything. null = not a zip file.
export function zipParts(bytes: Uint8Array): ZipPart[] | null {
  if (bytes.length < 22) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  // The end-of-central-directory record is within the last 64 KB + 22 bytes.
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 0xffff); i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) return null
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  const parts: ZipPart[] = []
  const decoder = new TextDecoder()
  for (let n = 0; n < count; n += 1) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) return null
    const size = view.getUint32(offset + 24, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    if (offset + 46 + nameLength > bytes.length) return null
    parts.push({ name: decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength)), size: size === 0xffffffff ? Infinity : size })
    offset += 46 + nameLength + extraLength + commentLength
  }
  return parts
}

// A message for a file that must not be opened, or null when it may be.
export function checkWorkbookFile(file: { name: string; size: number }, bytes?: Uint8Array): string | null {
  const extension = fileExtension(file.name)
  if (extension === 'xlsm' || extension === 'xlsb') return 'Workbooks with macros are not accepted. Save a copy as .xlsx (no macros) and try again.'
  if (!ALLOWED_EXTENSIONS.includes(extension)) return 'Choose an .xlsx or .csv file. (An old .xls file: open it and save it as .xlsx first.)'
  if (file.size > MAX_FILE_BYTES) return 'That file is bigger than 5 MB.'
  if (file.size === 0) return 'That file is empty.'
  if (!bytes || extension !== 'xlsx') return null

  const parts = zipParts(bytes)
  if (!parts) return "That doesn't look like an .xlsx file."
  if (parts.length > MAX_ZIP_PARTS) return 'That workbook has too many parts to open safely.'
  if (parts.some((part) => /vbaProject/i.test(part.name) || /^xl\/(macrosheets|activeX)\//i.test(part.name))) {
    return 'Workbooks with macros are not accepted. Save a copy as .xlsx (no macros) and try again.'
  }
  const unpacked = parts.reduce((total, part) => total + part.size, 0)
  if (unpacked > MAX_UNZIPPED_BYTES) return 'That workbook is too big once unpacked to open safely.'
  return null
}

// Excel stores a date as a day count: 1 = 1 Jan 1900 (with Excel's famous
// "1900 was a leap year" slip, so from March 1900 the count starts 30 Dec 1899).
// Time of day is dropped. null = not a plausible date.
export function excelSerialToIso(serial: number, date1904 = false): string | null {
  if (!Number.isFinite(serial)) return null
  const days = Math.floor(serial)
  if (!date1904 && days < 61) return null
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30)
  const date = new Date(epoch + days * 86_400_000)
  const year = date.getUTCFullYear()
  if (year < 1900 || year > 2100) return null
  return `${year}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

interface CellLike {
  t?: string
  v?: unknown
  z?: string | number
  l?: { Target?: string }
}

function cellText(XLSX: typeof Xlsx, cell: CellLike | undefined, date1904: boolean): string {
  if (!cell || cell.v === undefined || cell.v === null) return ''
  if (cell.t === 'e') return '' // #DIV/0! and friends: no value to bring over
  if (cell.t === 'b') return cell.v ? 'Yes' : ''
  if (cell.t === 'd' && cell.v instanceof Date) return cell.v.toISOString().slice(0, 10)
  if (cell.t === 'n' && typeof cell.v === 'number') {
    if (typeof cell.z === 'string' && XLSX.SSF.is_date(cell.z)) {
      const iso = excelSerialToIso(cell.v, date1904)
      if (iso) return iso
    }
    // 15 significant digits clears float noise like 1768.0000000000002.
    return String(Number(cell.v.toPrecision(15)))
  }
  return String(cell.v).trim()
}

function toRows(XLSX: typeof Xlsx, data: (CellLike | undefined)[][], date1904: boolean): SheetRow[] {
  const rows: SheetRow[] = []
  data.forEach((line, index) => {
    if (!line) return
    // A dense row has holes for empty cells (and `map` skips holes): fill them in.
    const cells = Array.from({ length: line.length }, (_, column) => cellText(XLSX, line[column], date1904))
    const links = Array.from({ length: line.length }, (_, column) => line[column]?.l?.Target ?? null)
    while (cells.length > 0 && cells[cells.length - 1] === '' && links[links.length - 1] === null) {
      cells.pop()
      links.pop()
    }
    if (cells.some((cell) => cell !== '')) rows.push({ cells, links, rowNumber: index + 1 })
  })
  return rows
}

export type ReadResult = { ok: true; sheets: SheetGrid[] } | { ok: false; message: string }

// A CSV / TSV / pasted-text file is one sheet.
export function readDelimitedFile(text: string, name: string): ReadResult {
  const parsed = parseDelimited(text)
  if (parsed.length === 0) return { ok: false, message: 'That file has no rows.' }
  if (parsed.length > MAX_SHEET_ROWS) return { ok: false, message: `That file has more than ${MAX_SHEET_ROWS.toLocaleString('en-US')} rows.` }
  const rows = parsed.map((cells, index) => ({ cells, links: cells.map(() => null), rowNumber: index + 1 }))
  return { ok: true, sheets: [{ name: name.replace(/\.[^.]+$/, ''), rows }] }
}

// Reads an .xlsx. `XLSX` is the library, passed in so it can be loaded only
// when somebody actually imports a file.
export function readWorkbook(XLSX: typeof Xlsx, bytes: Uint8Array): ReadResult {
  let workbook: Xlsx.WorkBook
  try {
    workbook = XLSX.read(bytes, {
      type: 'array',
      dense: true,
      cellFormula: false, // formulas are not read at all; only the value the file saved
      cellNF: true, // keep the number format, to tell dates from numbers
      cellStyles: false,
      cellHTML: false,
      bookVBA: false,
      sheetRows: MAX_SHEET_ROWS + 1,
    })
  } catch {
    return { ok: false, message: "That file couldn't be read. Is it a real .xlsx file?" }
  }
  if (workbook.SheetNames.length > MAX_SHEETS) return { ok: false, message: `That workbook has more than ${MAX_SHEETS} sheets.` }
  const date1904 = Boolean(workbook.Workbook?.WBProps?.date1904)

  const sheets: SheetGrid[] = []
  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name] as Xlsx.WorkSheet & { '!data'?: (CellLike | undefined)[][]; '!fullref'?: string }
    if (sheet['!fullref']) {
      return { ok: false, message: `The sheet “${name}” has more than ${MAX_SHEET_ROWS.toLocaleString('en-US')} rows.` }
    }
    sheets.push({ name, rows: toRows(XLSX, sheet['!data'] ?? [], date1904) })
  }
  return { ok: true, sheets }
}

// The address behind a cell, only when it is a plain https link.
export function httpsLink(link: string | null | undefined): string | null {
  if (!link) return null
  return /^https:\/\/\S+$/i.test(link.trim()) ? link.trim() : null
}
