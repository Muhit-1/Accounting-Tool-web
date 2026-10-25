import type * as Xlsx from 'xlsx'
import { api } from './api-client'
import { downloadFile } from './download'
import { exportFileName, neutralizeText } from './export-table'

// "Export with formulas": every table as a sheet. A formula column or a function row is written as an Excel
// formula (with the value it gave as the saved result), so the workbook still calculates in Excel and Upload a
// sheet reads it back into formula columns and function rows.

export type CellKind = 'text' | 'number' | 'money' | 'date' | 'bool'
export interface ExportCell {
  v: string | number | boolean | null
  f?: string
}
export interface ExportSheet {
  tableId: string
  name: string
  columns: { name: string; kind: CellKind }[]
  rows: ExportCell[][]
  fnRows: { label: string; row: number; cells: Record<string, ExportCell> }[]
}
export interface ExportData {
  sheets: ExportSheet[]
}

export function fetchExport(businessId: string, tableId?: string) {
  return api.get<ExportData>(`/businesses/${businessId}/export${tableId ? `?tableId=${encodeURIComponent(tableId)}` : ''}`)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/
/** days since 30 Dec 1899, the way Excel counts dates */
export function isoToSerial(iso: string): number | null {
  const m = ISO.exec(iso)
  if (!m) return null
  return Math.round((Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) - Date.UTC(1899, 11, 30)) / 86_400_000)
}

const MONEY = '#,##0.00'
const DATE = 'yyyy-mm-dd'

function cellOf(cell: ExportCell, kind: CellKind): Xlsx.CellObject | undefined {
  const { v, f } = cell
  let out: Xlsx.CellObject
  if (typeof v === 'number') out = { t: 'n', v, ...(kind === 'money' ? { z: MONEY } : {}) }
  else if (typeof v === 'boolean') out = { t: 'b', v }
  else if (typeof v === 'string' && v !== '') {
    const serial = kind === 'date' ? isoToSerial(v) : null
    // text that a spreadsheet could take for a formula is made harmless, as in every other export
    out = serial !== null ? { t: 'n', v: serial, z: DATE } : { t: 's', v: neutralizeText(v) }
  } else if (f) out = { t: 'n', v: 0 }
  else return undefined
  if (f) {
    out.f = f
    // a date that comes from a formula keeps its date format
    if (kind === 'date' && out.t === 'n') out.z = DATE
    if (kind === 'money' && out.t === 'n') out.z = MONEY
  }
  return out
}

/** the workbook, with the formulas as formulas */
export function buildExportWorkbook(XLSX: typeof Xlsx, data: ExportData): Xlsx.WorkBook {
  const wb = XLSX.utils.book_new()
  for (const sheet of data.sheets) {
    const ws: Xlsx.WorkSheet = {}
    sheet.columns.forEach((c, ci) => {
      ws[XLSX.utils.encode_cell({ r: 0, c: ci })] = { t: 's', v: c.name }
    })
    sheet.rows.forEach((row, ri) =>
      row.forEach((cell, ci) => {
        const made = cellOf(cell, sheet.columns[ci]?.kind ?? 'text')
        if (made) ws[XLSX.utils.encode_cell({ r: ri + 1, c: ci })] = made
      }),
    )
    let lastRow = sheet.rows.length
    for (const fn of sheet.fnRows) {
      const r = fn.row - 1
      const used = Object.keys(fn.cells).map(Number)
      // the label sits in the first column, unless that column has a result of its own
      if (!used.includes(0)) ws[XLSX.utils.encode_cell({ r, c: 0 })] = { t: 's', v: fn.label }
      for (const [ci, cell] of Object.entries(fn.cells)) {
        const made = cellOf(cell, sheet.columns[Number(ci)]?.kind ?? 'text')
        if (made) ws[XLSX.utils.encode_cell({ r, c: Number(ci) })] = made
      }
      lastRow = Math.max(lastRow, r)
    }
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: Math.max(0, sheet.columns.length - 1) } })
    ws['!cols'] = sheet.columns.map((c) => ({ wch: Math.min(40, Math.max(10, c.name.length + 2)) }))
    XLSX.utils.book_append_sheet(wb, ws, sheet.name)
  }
  return wb
}

export function exportWorkbookBytes(XLSX: typeof Xlsx, data: ExportData): ArrayBuffer {
  return XLSX.write(buildExportWorkbook(XLSX, data), { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

export const exportBookName = (name: string) => exportFileName(name, 'xlsx')

// Fetches the tables, writes the workbook and hands it to the browser's save flow. Returns how many sheets it holds.
export async function saveExport(businessId: string, fileName: string, tableId?: string): Promise<number> {
  const data = await fetchExport(businessId, tableId)
  const XLSX = await import('xlsx')
  downloadFile(exportWorkbookBytes(XLSX, data), fileName, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  return data.sheets.length
}
