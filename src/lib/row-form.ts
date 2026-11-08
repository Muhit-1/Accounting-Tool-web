// The row form for a phone: one box per column you can type in, instead of a sheet. Pure, so the rules are tested
// without a browser. The server checks everything again.

import { isDerived, planCellEdit } from './table-grid'
import type { EngineRow, TableField } from '../types/engine'

/** The columns a person can type in (not the ones that are worked out for them). */
export const formFields = (fields: TableField[]): TableField[] => fields.filter((f) => !isDerived(f))

/**
 * The text each box starts with: the row's own value. A date is YYYY-MM-DD (what a date box wants), a tick is
 * true or false, a link is the id of the linked row.
 */
export function initialFormValues(fields: TableField[], row?: EngineRow): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of formFields(fields)) {
    const v = row?.values[f.id]
    if (f.type === 'TICK') out[f.id] = v === true ? 'true' : 'false'
    else if (v === null || v === undefined) out[f.id] = ''
    else if (f.type === 'LINK') out[f.id] = Array.isArray(v) && typeof v[0] === 'string' ? v[0] : ''
    else out[f.id] = String(v)
  }
  return out
}

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

export type RowSave = { ok: true; values: Record<string, unknown> } | { ok: false; column: string; message: string }

/**
 * What to send. A new row: every box that has something in it. A row that exists: only the boxes that changed
 * (`values` is empty when nothing did). A wrong box is named in plain words.
 */
export function buildRowSave(fields: TableField[], texts: Record<string, string>, row?: EngineRow): RowSave {
  const values: Record<string, unknown> = {}
  for (const f of formFields(fields)) {
    const text = texts[f.id] ?? ''
    if (!row && (text === '' || (f.type === 'TICK' && text === 'false'))) continue
    const plan = planCellEdit(f, text)
    if (plan.kind === 'error') return { ok: false, column: f.id, message: `${f.name}: ${plan.message}` }
    if (row) {
      const before = f.type === 'TICK' ? row.values[f.id] === true : f.type === 'LINK' ? (row.values[f.id] ?? []) : row.values[f.id]
      if (same(plan.value, before)) continue
    }
    values[f.id] = plan.value
  }
  if (!row && Object.keys(values).length === 0) return { ok: false, column: formFields(fields)[0]?.id ?? '', message: 'Fill in at least one box first.' }
  return { ok: true, values }
}
