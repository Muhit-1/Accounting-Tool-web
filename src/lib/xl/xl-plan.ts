import type { Analysis, AnalyzedColumn, AnalyzedTable, CellValue } from './xl-analyze'

// What the server is asked to build: the analysis, minus the tables the person switched off, in the
// shape of accounting-api/src/tables/import-plan.ts.

export interface PlanFieldOut {
  key: string
  name: string
  type: string
  options?: string[]
  prefix?: string
  linkTo?: string
  formula?: string
}
export interface PlanTableOut {
  name: string
  fields: PlanFieldOut[]
  rows: Record<string, CellValue | string[]>[]
  expected: Record<string, CellValue[]>
  fnRows: { label: string; cells: Record<string, { fn: string; formula?: string }> }[]
  rule?: { amount: string; date: string | null; direction: 'IN' | 'OUT'; when: { field: string; op: string; value: string }[]; description: string }
}
export interface ImportPlanOut {
  tables: PlanTableOut[]
}

const mentions = (formula: string, tableName: string) => formula.includes(`${tableName}[`) || formula.includes(`'${tableName}'[`)

function plainTypeOf(column: AnalyzedColumn, values: CellValue[]): string {
  if (column.type === 'FORMULA') return values.some((v) => typeof v === 'number') && values.every((v) => v === null || typeof v === 'number') ? 'MONEY' : 'TEXT'
  return column.type
}

export function buildPlan(analysis: Analysis, include: Record<string, boolean>): ImportPlanOut {
  const picked = analysis.tables.filter((t) => include[t.name] ?? t.include)
  const names = new Set(picked.map((t) => t.name))
  const out: PlanTableOut[] = []
  for (const t of picked) {
    const fields: PlanFieldOut[] = []
    const rows = t.rows.map((r) => ({ ...r }))
    const expected: Record<string, CellValue[]> = {}
    for (const c of t.columns) {
      const dependsOnLeftOut = c.type === 'FORMULA' && analysis.tables.some((o) => !names.has(o.name) && mentions(c.formula ?? '', o.name))
      if (c.type === 'FORMULA' && !dependsOnLeftOut) {
        fields.push({ key: c.key, name: c.name, type: 'FORMULA', formula: c.formula })
        expected[c.key] = t.expected[c.key] ?? []
      } else if (c.type === 'FORMULA') {
        // a formula that reads a table left out becomes its saved values
        const values = t.expected[c.key] ?? []
        fields.push({ key: c.key, name: c.name, type: plainTypeOf(c, values) })
        rows.forEach((r, i) => {
          if (values[i] !== null && values[i] !== undefined) r[c.key] = values[i] as CellValue
        })
      } else if (c.type === 'LINK' && !(c.linkTo && names.has(c.linkTo))) {
        fields.push({ key: c.key, name: c.name, type: 'TEXT' })
      } else if (c.type === 'LINK') {
        fields.push({ key: c.key, name: c.name, type: 'LINK', linkTo: c.linkTo })
        const markers = (c.blankMarkers ?? []).map((m) => m.trim().toLowerCase())
        rows.forEach((r) => {
          const v = r[c.key]
          if (typeof v === 'string' && markers.includes(v.trim().toLowerCase())) delete r[c.key]
        })
      } else if (c.type === 'CHOICE') fields.push({ key: c.key, name: c.name, type: 'CHOICE', options: c.options })
      else if (c.type === 'AUTO') fields.push({ key: c.key, name: c.name, type: 'AUTO', prefix: c.prefix ?? '' })
      else fields.push({ key: c.key, name: c.name, type: c.type })
    }
    const fnRows = t.fnRows
      .map((fr) => ({
        label: fr.label,
        cells: Object.fromEntries(
          Object.entries(fr.cells)
            .filter(([key]) => fields.some((f) => f.key === key))
            .filter(([, spec]) => !(spec.fn === 'formula' && analysis.tables.some((o) => !names.has(o.name) && mentions(spec.formula ?? '', o.name))))
            .map(([key, spec]) => [key, spec.fn === 'formula' ? { fn: 'formula', formula: spec.formula } : { fn: spec.fn }]),
        ),
      }))
      .filter((fr) => Object.keys(fr.cells).length > 0)
    const table: PlanTableOut = { name: t.name, fields, rows, expected, fnRows }
    const rule = t.rule
    if (rule && fields.some((f) => f.key === rule.amount)) {
      table.rule = { amount: rule.amount, date: rule.date, direction: rule.direction, when: rule.when, description: rule.description }
    }
    out.push(table)
  }
  return { tables: out }
}

export type { AnalyzedTable }
