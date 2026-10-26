// What a person may type into a cell of one of their own tables, and what the add-row turns into.
// Pure, so the rules are tested without a browser. The server checks everything again.
import { formatDateCell, formatMoneyCell, parseDateInput } from './grid-parse'
import type { EngineRow, TableField } from '../types/engine'

export type CellPlan = { kind: 'ok'; value: unknown } | { kind: 'error'; message: string }
const ok = (value: unknown): CellPlan => ({ kind: 'ok', value })
const fail = (message: string): CellPlan => ({ kind: 'error', message })

export const DERIVED = ['AUTO', 'LOOKUP', 'ROLLUP', 'FORMULA']
export const isDerived = (field: TableField) => DERIVED.includes(field.type)

const MAX_NUMBER = 1_000_000_000_000

// "1,250.5" -> 1250.5; negatives are fine in your own tables.
export function parseNumberInput(text: string, wholeCents: boolean): { kind: 'empty' } | { kind: 'ok'; value: number } | { kind: 'error'; message: string } {
  const cleaned = text.replace(/[,\s]/g, '')
  if (cleaned === '') return { kind: 'empty' }
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(cleaned)) return { kind: 'error', message: 'Type a number, like 1,250.' }
  const value = Number(cleaned)
  if (Math.abs(value) > MAX_NUMBER) return { kind: 'error', message: 'That number is too big.' }
  if (wholeCents && /\.\d{3,}/.test(cleaned)) return { kind: 'error', message: 'Money has at most 2 decimals.' }
  return { kind: 'ok', value }
}

// Typing in a cell. For a choice the text is the chosen word, for a link the id of the chosen row.
export function planCellEdit(field: TableField, text: string): CellPlan {
  switch (field.type) {
    case 'TEXT':
      return ok(text === '' ? null : text)
    case 'NUMBER':
    case 'MONEY': {
      const parsed = parseNumberInput(text, field.type === 'MONEY')
      if (parsed.kind === 'error') return fail(parsed.message)
      return ok(parsed.kind === 'empty' ? null : parsed.value)
    }
    case 'DATE': {
      if (text.trim() === '') return ok(null)
      const iso = parseDateInput(text)
      return iso ? ok(iso) : fail('Use a date like 12 Oct 2026.')
    }
    case 'TICK':
      return ok(text === 'true')
    case 'CHOICE': {
      if (text === '') return ok(null)
      const options = Array.isArray(field.config.options) ? (field.config.options as string[]) : []
      const hit = options.find((o) => o.toLowerCase() === text.trim().toLowerCase())
      return hit ? ok(hit) : fail('Choose one of the choices.')
    }
    case 'LINK':
      return ok(text === '' ? [] : [text])
    default:
      return fail('This column is worked out for you.')
  }
}

// The add-row at the bottom: every typed cell becomes a value; a wrong one is named.
export function buildDraftValues(fields: TableField[], draft: Record<string, string>): { ok: true; values: Record<string, unknown> } | { ok: false; column: string; message: string } {
  const values: Record<string, unknown> = {}
  for (const field of fields) {
    if (isDerived(field)) continue
    const text = draft[field.id]
    if (text === undefined || text === '') continue
    const plan = planCellEdit(field, text)
    if (plan.kind === 'error') return { ok: false, column: field.id, message: `${field.name}: ${plan.message}` }
    values[field.id] = plan.value
  }
  if (Object.keys(values).length === 0) return { ok: false, column: fields.find((f) => !isDerived(f))?.id ?? '', message: 'Type something in the row first.' }
  return { ok: true, values }
}

// How a cell reads when nobody is typing in it.
export function cellText(field: TableField, row: EngineRow): string {
  const worked = row.cells[field.id]
  if (worked) {
    if (worked.e) return worked.e
    return formatWorked(field, worked.v)
  }
  const v = row.values[field.id]
  if (v === null || v === undefined) return ''
  if (field.type === 'MONEY' && typeof v === 'number') return formatMoneyCell(v)
  if (field.type === 'DATE' && typeof v === 'string') return formatDateCell(v)
  if (field.type === 'TICK') return v === true ? 'Yes' : ''
  return String(v)
}

function formatWorked(field: TableField, v: string | number | boolean | null): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') {
    // results read as money (two decimals) unless the column counts things
    const plain = (field.type === 'ROLLUP' && field.config.how === 'count') || field.config.format === 'number'
    return plain ? String(v) : formatMoneyCell(v)
  }
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return formatDateCell(v)
  return v
}

// Column width by kind.
export function columnWidth(field: TableField): string {
  switch (field.type) {
    case 'TICK':
      return '84px'
    case 'AUTO':
    case 'NUMBER':
      return '110px'
    case 'MONEY':
    case 'ROLLUP':
      return '130px'
    case 'DATE':
      return '130px'
    case 'CHOICE':
    case 'LOOKUP':
    case 'FORMULA':
      return '160px'
    case 'LINK':
      return '190px'
    default:
      return 'minmax(180px,1fr)'
  }
}

export const TYPE_LABEL: Record<TableField['type'], string> = {
  TEXT: 'Text',
  NUMBER: 'Number',
  MONEY: 'Money',
  DATE: 'Date',
  CHOICE: 'Choice list',
  TICK: 'Tick box',
  AUTO: 'Auto number',
  LINK: 'Link to table',
  LOOKUP: 'Lookup',
  ROLLUP: 'Rollup',
  FORMULA: 'Formula',
}
export const TYPE_HINT: Record<TableField['type'], string> = {
  TEXT: 'Words, names',
  NUMBER: 'Quantities',
  MONEY: 'Amounts, whole cents',
  DATE: 'A day',
  CHOICE: 'Pick one',
  TICK: 'Yes or no',
  AUTO: 'ORD-0001, 0002 …',
  LINK: 'Connect rows of another table',
  LOOKUP: 'Show a column of a linked row',
  ROLLUP: 'Add up linked rows',
  FORMULA: 'Worked out from other columns',
}

// What a summary-row cell is called in words, shown before its number ("Sum 11,450.00").
export const FN_LABEL: Record<string, string> = { sum: 'Sum', avg: 'Average', count: 'Count', min: 'Min', max: 'Max', last: 'Last', formula: 'Formula' }
