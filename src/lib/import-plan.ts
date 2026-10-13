// The plan of an import: which sheet goes to which table, how its columns are
// matched, and — before anything is saved — what each table would receive.
// All pure: the wizard screen only shows this and lets the person change it.
import {
  columnChoices,
  guessMapping,
  guessTable,
  sourceRows,
  type ColumnChoice,
  type ColumnMapping,
  type ImportTableInfo,
  type SourceRow,
} from './sheet-import'
import { findFileTotals, segmentGrid, type FileTotals, type Segment, type SheetGrid } from './sheet-segments'
import { MAX_IMPORT_ROWS, type ImportOptions, type ImportRunner, type MoneyTotals, type RowCheck } from './paste-import'
import { sumMoney } from './grid-rows'

export interface SheetPlan {
  sheet: SheetGrid
  // null = Skip.
  tableKey: string | null
  // Why it starts as Skip, when it does.
  reason?: string
  segments: Segment[]
  mapping: ColumnMapping
}

function planFor(sheet: SheetGrid, tableKey: string | null, tables: ImportTableInfo[], reason?: string): SheetPlan {
  const table = tables.find((candidate) => candidate.key === tableKey)
  const segments = table ? segmentGrid(sheet, table) : []
  return { sheet, tableKey: table ? table.key : null, reason, segments, mapping: table ? guessMapping(segments, table.targets) : {} }
}

// The first guess for every sheet of the file.
export function planSheets(sheets: SheetGrid[], tables: ImportTableInfo[]): SheetPlan[] {
  return sheets.map((sheet) => {
    // Segment once per table to judge which one the sheet is; the plan keeps the chosen table's reading.
    const guess = guessTable(sheet, tables.length === 1 ? segmentGrid(sheet, tables[0]) : tables.flatMap((table) => segmentGrid(sheet, table)), tables)
    return planFor(sheet, guess.tableKey, tables, guess.reason)
  })
}

// The person picked another table (or Skip) for a sheet.
export function withTable(plan: SheetPlan, tableKey: string | null, tables: ImportTableInfo[]): SheetPlan {
  return planFor(plan.sheet, tableKey, tables, tableKey === null ? 'You chose to skip it' : undefined)
}

// The person matched a column of the file to one of the table's columns (or none).
// A column of the table is fed by one column of the file: the earlier choice is released.
export function withMapping(plan: SheetPlan, key: string, targetId: string | null): SheetPlan {
  const mapping: ColumnMapping = { ...plan.mapping }
  if (targetId !== null) {
    for (const other of Object.keys(mapping)) if (mapping[other] === targetId) mapping[other] = null
  }
  mapping[key] = targetId
  return { ...plan, mapping }
}

export function planColumns(plan: SheetPlan): ColumnChoice[] {
  return columnChoices(plan.segments, plan.mapping)
}

export interface CheckedSheetRow {
  sheetName: string
  rowNumber: number
  check: RowCheck<unknown>
}

export interface FileComparison {
  sheetName: string
  file: FileTotals
  // What the sheet's rows add up to: the ones that would be added plus the ones already there.
  rows: MoneyTotals
  // What the sheet works out itself and the import leaves out (its Orders total, say).
  leftOut: MoneyTotals
  matches: boolean
}

export interface TableCheck {
  tableKey: string
  label: string
  ready: unknown[]
  counts: { ready: number; duplicate: number; problem: number; skipped: number }
  problems: { sheetName: string; rowNumber: number; message: string }[]
  skipped: { sheetName: string; rowNumber: number; reason: string }[]
  // One line about the ready rows ("46,866.00 money in, 46,041.00 money out").
  summary: string | null
  readyTotals: MoneyTotals | null
  comparisons: FileComparison[]
  // Set when a sheet has more rows than one import takes.
  tooMany: string | null
}

function addTotals(a: MoneyTotals, b: MoneyTotals): MoneyTotals {
  return { moneyIn: sumMoney([a.moneyIn, b.moneyIn]), moneyOut: sumMoney([a.moneyOut, b.moneyOut]) }
}

interface Pending {
  plan: SheetPlan
  rows: SourceRow[]
}

// Runs every row of every sheet through its table's checks. Nothing is saved.
export function checkPlans(
  plans: SheetPlan[],
  tables: ImportTableInfo[],
  runners: Record<string, ImportRunner>,
  options: ImportOptions,
): TableCheck[] {
  const byTable = new Map<string, Pending[]>()
  for (const plan of plans) {
    if (plan.tableKey === null) continue
    byTable.set(plan.tableKey, [...(byTable.get(plan.tableKey) ?? []), { plan, rows: sourceRows(plan.sheet, plan.segments, plan.mapping) }])
  }

  const checks: TableCheck[] = []
  for (const [tableKey, pending] of byTable) {
    const runner = runners[tableKey]
    const table = tables.find((candidate) => candidate.key === tableKey)
    if (!runner || !table) continue

    const all = pending.flatMap(({ plan, rows }) => rows.map((row) => ({ plan, row })))
    const real = all.filter((entry) => entry.row.skip === null)
    const left = all.filter((entry) => entry.row.skip !== null)
    const tooMany = real.length > MAX_IMPORT_ROWS ? `More than ${MAX_IMPORT_ROWS.toLocaleString('en-US')} rows for ${table.label}: import ${MAX_IMPORT_ROWS.toLocaleString('en-US')} at a time.` : null

    const results = tooMany ? [] : runner.evaluate(real.map((entry) => entry.row.values), options)

    const ready: unknown[] = []
    const problems: TableCheck['problems'] = []
    let duplicate = 0
    const perSheet = new Map<string, { rows: unknown[]; left: Record<string, string>[] }>()
    const bucket = (name: string) => perSheet.get(name) ?? perSheet.set(name, { rows: [], left: [] }).get(name)!

    results.forEach((result, index) => {
      const { plan, row } = real[index]
      if (result.status === 'ok') {
        ready.push(result.row)
        bucket(plan.sheet.name).rows.push(result.row)
      } else if (result.status === 'duplicate') {
        duplicate += 1
        bucket(plan.sheet.name).rows.push(result.row)
      } else if (result.status === 'error') {
        problems.push({ sheetName: plan.sheet.name, rowNumber: row.rowNumber, message: result.message })
      }
    })
    const skipped: TableCheck['skipped'] = left.map((entry) => ({ sheetName: entry.plan.sheet.name, rowNumber: entry.row.rowNumber, reason: entry.row.skip ?? '' }))
    for (const entry of left) bucket(entry.plan.sheet.name).left.push(entry.row.values)

    const comparisons: FileComparison[] = []
    if (runner.totals) {
      for (const { plan } of pending) {
        const file = findFileTotals(plan.sheet.rows)
        if (file.moneyIn === undefined && file.moneyOut === undefined) continue
        const sheetRows = perSheet.get(plan.sheet.name) ?? { rows: [], left: [] }
        const rows = runner.totals(sheetRows.rows)
        const leftOut = runner.valuesTotals ? runner.valuesTotals(sheetRows.left) : { moneyIn: 0, moneyOut: 0 }
        const total = addTotals(rows, leftOut)
        comparisons.push({
          sheetName: plan.sheet.name,
          file,
          rows,
          leftOut,
          matches: (file.moneyIn === undefined || file.moneyIn === total.moneyIn) && (file.moneyOut === undefined || file.moneyOut === total.moneyOut),
        })
      }
    }

    checks.push({
      tableKey,
      label: table.label,
      ready,
      counts: { ready: ready.length, duplicate, problem: problems.length, skipped: skipped.length },
      problems,
      skipped,
      summary: ready.length > 0 ? runner.summarize(ready) : null,
      readyTotals: runner.totals ? runner.totals(ready) : null,
      comparisons,
      tooMany,
    })
  }
  return checks
}
