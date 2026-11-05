// The grey example row of a brand-new blank table ("Tea and biscuit, 120.00, today"). It is only a hint drawn by the
// grid: it is never saved, so it can never end up in a report. Pure, so every rule is a test.

import type { EngineTable } from '../types/engine'

const DAY = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** Text per column id, or null when the table is not the plain starter table (Name / Amount / Date). */
export function exampleRowFor(table: Pick<EngineTable, 'templateKey' | 'fields'>, today: Date = new Date()): Record<string, string> | null {
  if (table.templateKey !== null) return null
  const fields = table.fields
  if (fields.length === 0 || fields.length > 4) return null
  if (fields.some((f) => f.type !== 'TEXT' && f.type !== 'MONEY' && f.type !== 'NUMBER' && f.type !== 'DATE')) return null
  const text = fields.find((f) => f.type === 'TEXT')
  if (!text) return null
  const amount = fields.find((f) => f.type === 'MONEY' || f.type === 'NUMBER')
  const date = fields.find((f) => f.type === 'DATE')
  const out: Record<string, string> = { [text.id]: 'Tea and biscuit' }
  if (amount) out[amount.id] = '120.00'
  if (date) out[date.id] = DAY.format(today)
  return out
}
