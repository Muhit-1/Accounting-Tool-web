import type { FieldFormat, TableField } from '../types/engine'

// How a column is shown (decimals, date style, alignment, thousands commas). The setting lives in the column's
// config as `format`; the API only checks it. Pure, so every rule is a test.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** The format of a column, or an empty one (older columns, or a config where `format` is something else). */
export function readFormat(field: Pick<TableField, 'config'>): FieldFormat {
  const raw = field.config.format
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const f = raw as Record<string, unknown>
  const out: FieldFormat = {}
  if (typeof f.decimals === 'number' && Number.isInteger(f.decimals) && f.decimals >= 0 && f.decimals <= 8) out.decimals = f.decimals
  if (f.dateFormat === 'iso' || f.dateFormat === 'dmy' || f.dateFormat === 'mdy' || f.dateFormat === 'long') out.dateFormat = f.dateFormat
  if (f.align === 'left' || f.align === 'center' || f.align === 'right') out.align = f.align
  if (typeof f.thousands === 'boolean') out.thousands = f.thousands
  return out
}

export const hasFormat = (field: Pick<TableField, 'config'>) => Object.keys(readFormat(field)).length > 0

/** A number with the column's decimals and commas; `defaultDecimals` is what the type shows when nothing is set. */
export function formatNumber(value: number, format: FieldFormat, defaultDecimals: number): string {
  const decimals = format.decimals ?? defaultDecimals
  const text = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: format.thousands !== false })
  return `${value < 0 && Number(text.replace(/[^\d.]/g, '')) !== 0 ? '-' : ''}${text}`
}

/** 2026-10-25 as 2026-10-25, 25/10/2026, 10/25/2026 or 25 Oct 2026. Anything that is not a date is returned as it is. */
export function formatDateWith(iso: string, style: NonNullable<FieldFormat['dateFormat']>): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  switch (style) {
    case 'iso':
      return `${y}-${mo}-${d}`
    case 'dmy':
      return `${d}/${mo}/${y}`
    case 'mdy':
      return `${mo}/${d}/${y}`
    case 'long':
      return `${Number(d)} ${MONTHS[Number(mo) - 1]} ${y}`
  }
}

export const DATE_STYLES: { value: NonNullable<FieldFormat['dateFormat']>; label: string; example: string }[] = [
  { value: 'long', label: '25 Oct 2026', example: formatDateWith('2026-10-25', 'long') },
  { value: 'dmy', label: '25/10/2026', example: formatDateWith('2026-10-25', 'dmy') },
  { value: 'mdy', label: '10/25/2026', example: formatDateWith('2026-10-25', 'mdy') },
  { value: 'iso', label: '2026-10-25', example: formatDateWith('2026-10-25', 'iso') },
]

/** What goes into the column's config when the person changes the format (an empty format is left out). */
export function formatConfig(format: FieldFormat): { format?: FieldFormat } {
  const clean: FieldFormat = {}
  if (format.decimals !== undefined) clean.decimals = format.decimals
  if (format.dateFormat) clean.dateFormat = format.dateFormat
  if (format.align) clean.align = format.align
  if (format.thousands !== undefined) clean.thousands = format.thousands
  return Object.keys(clean).length > 0 ? { format: clean } : {}
}
