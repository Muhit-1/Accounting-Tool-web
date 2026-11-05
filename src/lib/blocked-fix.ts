// What to do about rows that match a "Posts to Cash book" rule but cannot post. Pure, so every rule is a test.
//
// The common case is a date: the rule posts on "Delivered on" and some delivered rows have none. When the table has
// another date column (the order date), the rows can be given that date in one go. Nothing else is guessed.

import type { BlockedRow, EngineRow, EngineTable, RuleConfig, TableField } from '../types/engine'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/** The date column to copy from: the first other date column of the table (null when there is none or the rule has no date). */
export function pickDateSource(table: EngineTable, rule: RuleConfig): TableField | null {
  if (!rule.dateFieldId) return null
  return [...table.fields].filter((f) => f.type === 'DATE' && f.id !== rule.dateFieldId).sort((a, b) => a.position - b.position)[0] ?? null
}

/** The row updates that give each blocked-by-date row the date of `sourceFieldId`; `missing` rows have no such date either. */
export function buildDateFix(blocked: BlockedRow[], rows: EngineRow[], targetFieldId: string, sourceFieldId: string) {
  const byId = new Map(rows.map((r) => [r.id, r]))
  const updates: { id: string; values: Record<string, unknown>; version: number }[] = []
  let missing = 0
  for (const b of blocked) {
    if (b.reason !== 'date') continue
    const row = byId.get(b.rowId)
    const v = row?.values[sourceFieldId]
    if (row && typeof v === 'string' && ISO_DAY.test(v)) updates.push({ id: row.id, values: { [targetFieldId]: v }, version: row.version })
    else missing++
  }
  return { updates, missing }
}

/** Why the rows cannot post, in a few plain words ("have no usable date"). */
export function blockedReason(blocked: BlockedRow[]): string {
  const dates = blocked.filter((b) => b.reason === 'date').length
  const errors = blocked.length - dates
  if (blocked.length === 0) return ''
  if (errors === 0) return 'no usable date'
  if (dates === 0) return 'a formula error'
  return 'no usable date or a formula error'
}
