// Saving a table as a file: values only (no formulas), numbers stay numbers,
// and text that a spreadsheet could take for a formula is made harmless.
import type * as Xlsx from 'xlsx'

export type ExportCell = string | number | null | undefined

// A text cell that starts with = + - @ (or a tab / carriage return) can be run
// as a formula when the file is opened in Excel or Sheets — "=HYPERLINK(...)"
// from a pasted description, say. A leading ' makes it plain text there.
// Numbers are not text and are left alone (a negative amount stays -5).
export function neutralizeText(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

export function exportValue(cell: ExportCell): string | number {
  if (cell === null || cell === undefined) return ''
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : ''
  return neutralizeText(cell)
}

function csvCell(cell: ExportCell): string {
  const value = exportValue(cell)
  const text = typeof value === 'number' ? String(value) : value
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// CSV with a byte order mark, so Excel reads the text as UTF-8 (₹, ৳ and Bangla names).
export function toCsv(headers: string[], rows: ExportCell[][]): string {
  const lines = [headers, ...rows].map((line) => line.map(csvCell).join(','))
  return `﻿${lines.join('\r\n')}\r\n`
}

export function toXlsx(XLSX: typeof Xlsx, sheetName: string, headers: string[], rows: ExportCell[][]): Uint8Array {
  const data = [headers, ...rows].map((line) => line.map(exportValue))
  const sheet = XLSX.utils.aoa_to_sheet(data)
  const book = XLSX.utils.book_new()
  // Excel allows 31 characters and none of : \ / ? * [ ]
  XLSX.utils.book_append_sheet(book, sheet, sheetName.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet1')
  return new Uint8Array(XLSX.write(book, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}

// "Cash book" + .csv -> "Cash-book-2026-10-13.csv"
export function exportFileName(tableName: string, extension: 'csv' | 'xlsx', now: Date = new Date()): string {
  const base = tableName.trim().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '') || 'table'
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  return `${base}-${day}.${extension}`
}
