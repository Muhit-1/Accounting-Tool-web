import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { buildExportWorkbook, exportWorkbookBytes, isoToSerial, type ExportData } from './export-formulas'
import { readXl } from './xl/read'
import { analyzeSheets } from './xl/xl-pipeline'
import { buildPlan } from './xl/xl-plan'

// What the server sends for two tables: Orders (a formula column and a function row) and a short list that
// the formulas of Orders could read.
const data: ExportData = {
  sheets: [
    {
      tableId: 't1',
      name: 'Orders',
      columns: [
        { name: 'Customer', kind: 'text' },
        { name: 'Order date', kind: 'date' },
        { name: 'Subtotal', kind: 'money' },
        { name: 'Delivery', kind: 'money' },
        { name: 'Total', kind: 'money' },
        { name: 'Status', kind: 'text' },
      ],
      rows: [
        [{ v: 'Afrina' }, { v: '2026-10-02' }, { v: 1000 }, { v: 100 }, { v: 1100, f: 'C2+D2' }, { v: 'Delivered' }],
        [{ v: 'Nusrat' }, { v: '2026-10-03' }, { v: 1300 }, { v: 100 }, { v: 1400, f: 'C3+D3' }, { v: 'New' }],
        [{ v: 'Rafi' }, { v: '2026-10-04' }, { v: 850 }, { v: 0 }, { v: 850, f: 'C4+D4' }, { v: 'Delivered' }],
      ],
      fnRows: [
        { label: 'Total', row: 6, cells: { '2': { v: 3150, f: 'SUM(C2:C4)' }, '3': { v: 200, f: 'SUM(D2:D4)' }, '4': { v: 3350, f: 'SUM(E2:E4)' } } },
        { label: 'Delivered', row: 7, cells: { '4': { v: 1950, f: 'SUMIF($F$2:$F$4,"Delivered",$E$2:$E$4)' } } },
      ],
    },
  ],
}

describe('export with formulas', () => {
  it('counts dates the way Excel does', () => {
    expect(isoToSerial('1900-03-01')).toBe(61)
    expect(isoToSerial('2026-10-02')).toBe(46297)
    expect(isoToSerial('not a date')).toBeNull()
  })

  it('writes formulas as formulas, with their results saved beside them', () => {
    const ws = buildExportWorkbook(XLSX, data).Sheets.Orders
    expect(ws.E2).toMatchObject({ t: 'n', v: 1100, f: 'C2+D2' })
    expect(ws.E3.f).toBe('C3+D3')
    expect(ws.C6.f).toBe('SUM(C2:C4)')
    expect(ws.E7.f).toBe('SUMIF($F$2:$F$4,"Delivered",$E$2:$E$4)')
    // the label of a function row is in the first column; dates are real dates; text is just text
    expect(ws.A6.v).toBe('Total')
    expect(ws.B2).toMatchObject({ t: 'n', v: 46297, z: 'yyyy-mm-dd' })
    expect(ws.A2).toMatchObject({ t: 's', v: 'Afrina' })
  })

  it('makes text that looks like a formula harmless', () => {
    const ws = buildExportWorkbook(XLSX, { sheets: [{ ...data.sheets[0], rows: [[{ v: '=HYPERLINK("http://x")' }, { v: null }, { v: 1 }, { v: 1 }, { v: 2, f: 'C2+D2' }, { v: '' }]], fnRows: [] }] }).Sheets.Orders
    expect(ws.A2.v).toBe("'=HYPERLINK(\"http://x\")")
    expect(ws.A2.f).toBeUndefined()
  })

  it('can be uploaded again: the formula column and the function rows come back', () => {
    const bytes = new Uint8Array(exportWorkbookBytes(XLSX, data))
    const read = readXl(XLSX, bytes)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.formulaCount).toBeGreaterThanOrEqual(6)
    const found = analyzeSheets(read.sheets)
    const orders = found.tables.find((t) => t.name === 'Orders')
    expect(orders).toBeTruthy();
    const total = orders?.columns.find((c) => c.name === 'Total')
    expect(total?.type).toBe('FORMULA')
    expect(total?.formula).toContain('{Subtotal}')
    expect(total?.formula).toContain('{Delivery}')
    expect(orders?.rows).toHaveLength(3)
    expect(orders?.fnRows.map((r) => r.label)).toEqual(['Total', 'Delivered'])
    const plan = buildPlan(found, { Orders: true })
    expect(plan.tables[0].expected?.total ?? plan.tables[0].expected).toBeTruthy()
  })
})
