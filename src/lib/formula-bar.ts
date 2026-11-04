import type { EngineTable, TableField } from '../types/engine'

// What the formula bar shows for a column: a worked-out column explains itself in plain words, with column NAMES
// (never cell addresses). Pure, so it is easy to test.

export interface FormulaPart {
  kind: 'ref' | 'text'
  text: string
}

const READABLE: Record<string, string> = { '*': '×', '/': '÷', '<=': '≤', '>=': '≥', '<>': '≠' }

/** Splits a formula into column names (shown as chips) and the rest: `{Qty} * {Price}` becomes Qty × Price. */
export function formulaParts(formula: string): FormulaPart[] {
  const parts: FormulaPart[] = []
  const re = /\{([^{}]+)\}|([A-Za-z][A-Za-z0-9 ]*)\[([^[\]]+)\]/g
  let last = 0
  const pushText = (raw: string) => {
    if (raw === '') return
    const text = raw.replace(/<=|>=|<>|\*|\//g, (m) => READABLE[m] ?? m)
    const prev = parts[parts.length - 1]
    if (prev && prev.kind === 'text') prev.text += text
    else parts.push({ kind: 'text', text })
  }
  for (let m = re.exec(formula); m; m = re.exec(formula)) {
    pushText(formula.slice(last, m.index))
    parts.push({ kind: 'ref', text: m[1] ?? `${m[2].trim()}[${m[3]}]` })
    last = m.index + m[0].length
  }
  pushText(formula.slice(last))
  return parts.map((p) => (p.kind === 'text' ? { ...p, text: p.text.replace(/\s+/g, ' ') } : p))
}

const HOW: Record<string, string> = { sum: 'adds up', count: 'counts', avg: 'averages', min: 'takes the smallest of', max: 'takes the largest of' }

export type FieldExplain =
  | { kind: 'formula'; formula: string; parts: FormulaPart[] }
  | { kind: 'note'; text: string }
  | { kind: 'plain' }

/** What to say about a column in the formula bar. */
export function explainField(field: TableField, table: EngineTable, tables: EngineTable[]): FieldExplain {
  const c = field.config
  switch (field.type) {
    case 'FORMULA': {
      const formula = typeof c.formula === 'string' ? c.formula : ''
      return { kind: 'formula', formula, parts: formulaParts(formula) }
    }
    case 'LINK': {
      const target = tables.find((t) => t.id === c.targetTableId)
      return { kind: 'note', text: `Pick a row of ${target?.name ?? 'another table'}${c.multiple === true ? ' (more than one is fine)' : ''}.` }
    }
    case 'LOOKUP': {
      const link = table.fields.find((f) => f.id === c.linkFieldId)
      const target = tables.find((t) => t.id === link?.config.targetTableId)
      const source = target?.fields.find((f) => f.id === c.fieldId)
      return { kind: 'note', text: `Comes from ${target?.name ?? 'another table'}${source ? ` · ${source.name}` : ''}. Nobody types it here.` }
    }
    case 'ROLLUP': {
      const source = tables.find((t) => t.id === c.sourceTableId)
      const column = source?.fields.find((f) => f.id === c.fieldId)
      const how = HOW[String(c.how ?? 'sum')] ?? 'adds up'
      return { kind: 'note', text: `${how[0].toUpperCase()}${how.slice(1)} ${source?.name ?? 'another table'}${column ? ` · ${column.name}` : ''} for each row.` }
    }
    case 'AUTO':
      return { kind: 'note', text: `A number the sheet gives each row${typeof c.prefix === 'string' && c.prefix ? `, like ${c.prefix}1` : ''}.` }
    default:
      return { kind: 'plain' }
  }
}

/** "Subtotal · row 3", or "Subtotal · new row" in the empty row at the bottom. */
export function nameBoxText(fieldName: string, rowNumber: number | null): string {
  return `${fieldName} · ${rowNumber === null ? 'new row' : `row ${rowNumber}`}`
}
