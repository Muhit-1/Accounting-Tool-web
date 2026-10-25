import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { readXl, type XSheet } from './read'
import { analyzeSheets } from './xl-pipeline'
import { buildPlan } from './xl-plan'

// A workbook shaped like the owner's (title rows, a header on row 5, stacked ledger blocks, a crosstab),
// but with the formulas his Google Sheet has. Built in memory; nothing is evaluated by the reader.

type C = string | number | null | { v?: string | number; f: string; z?: string }

function sheetOf(rows: C[][]): XLSX.WorkSheet {
  const ws: XLSX.WorkSheet = {}
  let maxC = 0
  rows.forEach((row, r) =>
    row.forEach((cell, c) => {
      if (cell === null || cell === '') return
      const ref = XLSX.utils.encode_cell({ r, c })
      if (typeof cell === 'object') ws[ref] = { t: typeof cell.v === 'string' ? 's' : 'n', v: cell.v, f: cell.f, z: cell.z }
      else ws[ref] = typeof cell === 'number' ? { t: 'n', v: cell } : { t: 's', v: cell }
      maxC = Math.max(maxC, c)
    }),
  )
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: rows.length - 1, c: maxC } })
  return ws
}
const date = (serial: number, f?: string): C => ({ v: serial, f: f ?? '', z: 'd mmm yyyy' })
const day = (serial: number): C => ({ v: serial, f: '', z: 'd mmm yyyy' })

function bytesOf(sheets: Record<string, XLSX.WorkSheet>): Uint8Array {
  const wb = XLSX.utils.book_new()
  for (const [name, ws] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, ws, name)
  return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer)
}

// dates as plain numbers with a date format, formulas as {v, f}
const num = (serial: number): C => ({ v: serial, f: '__none__', z: 'd mmm yyyy' })

function workbook(): Uint8Array {
  const orders = sheetOf([
    ['ShopnoJhuri — Orders'], [], [], [],
    ['Order ID', 'Order Date', 'Customer Name', 'Items Subtotal (BDT)', 'Delivery Charge (BDT)', 'Discount (BDT)', 'Order Total (BDT)', 'Status', 'Delivery Date'],
    ['SJ-0002', null, 'afrina', 100, 0, 0, { v: 100, f: 'D6+E6-F6' }, 'Delivered', null],
    ['SJ-0003', null, 'Nusrat Jahan', 1300, 100, 0, { v: 1400, f: 'D7+E7-F7' }, 'Confirmed', null],
    ['SJ-0004', null, 'Rafi Ahmed', 850, 100, 50, { v: 900, f: 'D8+E8-F8' }, 'Shipped', null],
    [],
    ['Total', null, null, { v: 2250, f: 'SUM(D6:D8)' }, { v: 200, f: 'SUM(E6:E8)' }, { v: 50, f: 'SUM(F6:F8)' }, { v: 2400, f: 'SUM(G6:G8)' }],
    ['Delivered', null, null, null, null, null, { v: 100, f: 'SUMIFS(G6:G8,H6:H8,"Delivered")' }],
  ])
  const costRow = (n: number, group: string, item: string, rate: number | null, months: number | null, once: number | null, total: number, by: string, status: string): C[] => [
    null, group, item, rate, months, once, { v: total, f: `D${n}*E${n}+F${n}` }, by, { v: status, f: `IF(H${n}="Not paid yet","Due","Paid")` },
  ]
  const costs = sheetOf([
    ['ShopnoJhuri — All Costs'], [], [], [],
    ['#', 'Category', 'Item', 'Monthly Rate (BDT)', 'Months', 'One-time Amount (BDT)', 'Total Cost (BDT)', 'Paid By', 'Status'],
    costRow(6, 'SAM-Trek Services', 'Logo design', null, null, 7000, 7000, 'Not paid yet', 'Due'),
    costRow(7, 'SAM-Trek Services', 'Maintenance', 7000, 7, null, 49000, 'Not paid yet', 'Due'),
    costRow(8, 'Product Cost', '1st order', null, null, 18316, 18316, 'Shahidul Alam', 'Paid'),
    costRow(9, 'Overhead Cost', 'Rent + Utility', 7500, 5, null, 37500, 'Shahidul Alam', 'Paid'),
    costRow(10, 'Overhead Cost', 'Facebook ad', null, null, 2200, 2200, 'Md Hifzur Rahman Sumon', 'Paid'),
    costRow(11, 'Overhead Cost', 'Package test', null, null, 380, 380, 'Shahidul Alam', 'Paid'),
    [],
    ['Total', null, null, null, null, null, { v: 114396, f: 'SUM(G6:G11)' }],
  ])
  const owner = sheetOf([
    ['ShopnoJhuri — Owner Payments'], [], [], [],
    [null, 'Paid by', 'SAM-Trek Services', 'Product Cost', 'Overhead Cost', 'Total paid'],
    [null, 'Shahidul Alam', { v: 0, f: 'SUMIFS(Costs!G:G,Costs!H:H,B6,Costs!B:B,C$5)' }, { v: 18316, f: 'SUMIFS(Costs!G:G,Costs!H:H,B6,Costs!B:B,D$5)' }, { v: 37880, f: 'SUMIFS(Costs!G:G,Costs!H:H,B6,Costs!B:B,E$5)' }, { v: 56196, f: 'SUM(C6:E6)' }],
    [null, 'Md Hifzur Rahman Sumon', { v: 0, f: 'SUMIFS(Costs!G:G,Costs!H:H,B7,Costs!B:B,C$5)' }, { v: 0, f: 'SUMIFS(Costs!G:G,Costs!H:H,B7,Costs!B:B,D$5)' }, { v: 2200, f: 'SUMIFS(Costs!G:G,Costs!H:H,B7,Costs!B:B,E$5)' }, { v: 2200, f: 'SUM(C7:E7)' }],
  ])
  const ledger = sheetOf([
    ['ShopnoJhuri — Fund Ledger'], [],
    ['1.  CLIENT MONEY RECEIVED   (money in)'],
    ['Date', 'Description', 'Note', 'Proof', 'Amount (BDT)'],
    [day(46153), 'Initial payment for buying product', null, null, 5000],
    [day(46165), 'Due payment for the product that arrived', null, null, 15000],
    [],
    ['2.  ORDERS   (money in)  –  one total for all delivered orders'],
    ['Date', 'Description', 'Note', 'Proof', 'Amount (BDT)'],
    [null, 'All delivered orders – automatic total from the Orders sheet', 'automatic', null, { v: 100, f: 'SUMIFS(Orders!G6:G8,Orders!H6:H8,"Delivered")' }],
    [day(46222), 'Earlier orders 1–3', 'one total', null, 1768],
    [],
    ['3.  PRODUCT PURCHASE   (money out)'],
    ['Date', 'Description', 'Note', 'Proof', 'Amount (BDT)'],
    [day(46153), 'Bought the product', null, null, 4214],
  ])
  void date; void num
  return bytesOf({ Guide: sheetOf([['Start here.']]), 'Fund Ledger': ledger, Orders: orders, Costs: costs, 'Owner Payments': owner })
}

function read(): XSheet[] {
  const r = readXl(XLSX, workbook())
  if (!r.ok) throw new Error(r.message)
  return r.sheets
}

describe('reading a workbook with formulas', () => {
  it('keeps formulas as text next to the saved values, and reads dates', () => {
    const r = readXl(XLSX, workbook())
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.formulaCount).toBeGreaterThan(20)
    const orders = r.sheets.find((s) => s.name === 'Orders') as XSheet
    expect(orders.rows[5][6]).toMatchObject({ v: 100, f: 'D6+E6-F6' })
    const ledger = r.sheets.find((s) => s.name === 'Fund Ledger') as XSheet
    expect(ledger.rows[4][0]).toMatchObject({ v: '2026-05-11', isDate: true })
  })
})

describe('what the analysis finds in it', () => {
  const analysis = analyzeSheets(read())
  const table = (name: string) => analysis.tables.find((t) => t.name === name)!

  it('finds the ledger and the tables; Guide has nothing to import', () => {
    expect(analysis.ledgerSheets).toEqual(['Fund Ledger'])
    expect(analysis.tables.map((t) => [t.name, t.kind, t.include]).sort()).toEqual([
      ['Costs', 'table', true],
      ['Orders', 'table', true],
      ['Owner Payments', 'table', true],
    ])
    expect(analysis.skipped).toEqual([{ sheet: 'Guide', reason: 'No table found (no row of column names)' }])
  })

  it('Orders: columns of the right kind, the total as a formula, function rows under the table', () => {
    const o = table('Orders')
    expect(o.columns.map((c) => [c.name, c.type])).toEqual([
      ['Order ID', 'AUTO'],
      ['Order Date', 'TEXT'],
      ['Customer Name', 'TEXT'],
      ['Items Subtotal (BDT)', 'MONEY'],
      ['Delivery Charge (BDT)', 'MONEY'],
      ['Discount (BDT)', 'MONEY'],
      ['Order Total (BDT)', 'FORMULA'],
      ['Status', 'CHOICE'],
      ['Delivery Date', 'TEXT'],
    ])
    expect(o.columns.find((c) => c.name === 'Order Total (BDT)')).toMatchObject({ formula: '{Items Subtotal (BDT)} + {Delivery Charge (BDT)} - {Discount (BDT)}', formulaFrom: 'D6+E6-F6' })
    expect(o.rows.map((r) => r._number)).toEqual([2, 3, 4])
    expect(o.expected[o.columns[6].key]).toEqual([100, 1400, 900])
    expect(o.fnRows.map((f) => [f.label, Object.values(f.cells).map((c) => c.fn)])).toEqual([
      ['Total', ['sum', 'sum', 'sum', 'sum']],
      ['Delivered', ['formula']],
    ])
    expect(Object.values(o.fnRows[1].cells)[0].formula).toBe('SUMIFS({Order Total (BDT)}, {Status}, "Delivered")')
  })

  it('Costs: the total and the status are formulas, “Paid By” became a link to the sheet that lists the people', () => {
    const c = table('Costs')
    expect(c.columns.find((x) => x.name === 'Total Cost (BDT)')).toMatchObject({ type: 'FORMULA', formula: '{Monthly Rate (BDT)} * {Months} + {One-time Amount (BDT)}' })
    expect(c.columns.find((x) => x.name === 'Status')).toMatchObject({ type: 'FORMULA', formula: 'IF({Paid By} = "", "Due", "Paid")' })
    expect(c.columns.find((x) => x.name === 'Paid By')).toMatchObject({ type: 'LINK', linkTo: 'Owner Payments' })
  })

  it('Owner Payments, a crosstab of SUMIFS over Costs, is rebuilt as formula columns that read the Costs table', () => {
    const p = table('Owner Payments')
    const col = (name: string) => p.columns.find((c) => c.name === name)!
    expect(col('Product Cost')).toMatchObject({ type: 'FORMULA', formula: 'SUMIFS(Costs[Total Cost (BDT)], Costs[Paid By], {Paid by}, Costs[Category], "Product Cost")' })
    expect(col('Total paid')).toMatchObject({ type: 'FORMULA', formula: 'SUM({SAM-Trek Services}, {Product Cost}, {Overhead Cost})' })
    expect(p.expected[col('Total paid').key]).toEqual([56196, 2200])
  })

  it('the Orders rule is read from the ledger sheet: delivered orders, money in', () => {
    const o = table('Orders')
    expect(o.rule).toMatchObject({ direction: 'IN', when: [{ op: 'eq', value: 'Delivered' }], from: 'SUMIFS(Orders!G6:G8,Orders!H6:H8,"Delivered")' })
    expect(o.columns.find((c) => c.key === o.rule!.amount)!.name).toBe('Order Total (BDT)')
  })

  it('counts the formulas and what was rebuilt', () => {
    expect(analysis.formulaCells).toBeGreaterThan(15)
    expect(analysis.convertedCells).toBeGreaterThanOrEqual(15)
  })
})

describe('the plan sent to the server', () => {
  const analysis = analyzeSheets(read())
  const plan = buildPlan(analysis, {})
  it('keeps every table that is switched on', () => {
    expect(plan.tables.map((t) => t.name).sort()).toEqual(['Costs', 'Orders', 'Owner Payments'])
    const costs = plan.tables.find((t) => t.name === 'Costs')!
    expect(costs.fields.find((f) => f.name === 'Paid By')).toMatchObject({ type: 'LINK', linkTo: 'Owner Payments' })
    // "Not paid yet" is nobody, not a name
    const by = costs.fields.find((f) => f.name === 'Paid By')!.key
    expect(costs.rows.filter((r) => r[by] !== undefined).length).toBe(4)
    expect(costs.expected[costs.fields.find((f) => f.name === 'Total Cost (BDT)')!.key]).toEqual([7000, 49000, 18316, 37500, 2200, 380])
    const orders = plan.tables.find((t) => t.name === 'Orders')!
    expect(orders.rule).toMatchObject({ direction: 'IN' })
  })
  it('switching a table off turns links to it into plain text and formulas that read it into values', () => {
    const without = buildPlan(analysis, { 'Owner Payments': false })
    const costs = without.tables.find((t) => t.name === 'Costs')!
    expect(costs.fields.find((f) => f.name === 'Paid By')!.type).toBe('TEXT')
    expect(without.tables.map((t) => t.name).sort()).toEqual(['Costs', 'Orders'])
  })
})
