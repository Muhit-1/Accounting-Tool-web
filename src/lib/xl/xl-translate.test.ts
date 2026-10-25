import { describe, expect, it } from 'vitest'
import { colIndex, colLetters, parseExcel, refsOf, XlError } from './xl-formula'
import { translate, type Origin, type TableRegion, type TranslateEnv } from './xl-translate'

const cols = (pairs: [string, string][]) => new Map(pairs.map(([letter, name]) => [colIndex(letter), name]))
const orders: TableRegion = {
  name: 'Orders',
  sheet: 'Orders',
  headerRow: 4,
  firstRow: 5,
  lastRow: 10,
  cols: cols([['H', 'Subtotal'], ['I', 'Delivery'], ['J', 'Discount'], ['K', 'Total'], ['M', 'Status']]),
}
const costs: TableRegion = {
  name: 'Costs',
  sheet: 'Costs',
  headerRow: 4,
  firstRow: 5,
  lastRow: 16,
  cols: cols([['B', 'Category'], ['D', 'Monthly rate'], ['E', 'Months'], ['F', 'One-time'], ['G', 'Total'], ['H', 'Paid by'], ['I', 'Status']]),
}
const env: TranslateEnv = { tables: [orders, costs], linkBlanks: new Map([['costs|paid by', ['Not paid yet']]]) }
const inRow = (table: TableRegion, row: number): Origin => ({ sheet: table.sheet, row, col: 99, table, mode: 'row' })
const underTable = (table: TableRegion): Origin => ({ sheet: table.sheet, row: table.lastRow + 2, col: 99, table, mode: 'column' })
const t = (src: string, origin: Origin) => translate(parseExcel(src), origin, env)

describe('addresses', () => {
  it('turns letters into numbers and back', () => {
    expect(colIndex('A')).toBe(0)
    expect(colIndex('AA')).toBe(26)
    expect(colLetters(0)).toBe('A')
    expect(colLetters(27)).toBe('AB')
  })
})

describe('reading an Excel formula', () => {
  it('reads cells, ranges, sheets and absolute marks', () => {
    expect(parseExcel('=E2-F2')).toMatchObject({ t: 'bin', op: '-' })
    const refs = refsOf(parseExcel("=SUMIFS('Fund Ledger'!$F$2:$F$9, Orders!M:M, \"Delivered\")"))
    expect(refs.map((r) => [r.sheet, r.kind])).toEqual([['Fund Ledger', 'range'], ['Orders', 'cols']])
  })
  it('refuses what it cannot read, in words', () => {
    expect(() => parseExcel('=SUM({1,2,3})')).toThrow(XlError)
    expect(() => parseExcel('=IF(A1,,2)')).toThrow('empty argument')
    expect(() => parseExcel('=A1+')).toThrow('ends too early')
    expect(() => parseExcel('="abc')).toThrow('not closed')
  })
  it('knows strings with doubled quotes and percent', () => {
    expect(parseExcel('="a""b"')).toEqual({ t: 'str', v: 'a"b' })
    expect(parseExcel('=50%')).toEqual({ t: 'pct', a: { t: 'num', v: 50 } })
  })
})

describe('a formula in a data row becomes a formula column', () => {
  it('same-row cells become column names', () => {
    expect(t('=H6+I6-J6', inRow(orders, 5))).toEqual({ ok: true, formula: '{Subtotal} + {Delivery} - {Discount}' })
    expect(t('=D7*E7+F7', inRow(costs, 6))).toEqual({ ok: true, formula: '{Monthly rate} * {Months} + {One-time}' })
  })
  it('keeps brackets that matter and the Excel functions we have', () => {
    expect(t('=(H6+I6)*2', inRow(orders, 5))).toEqual({ ok: true, formula: '({Subtotal} + {Delivery}) * 2' })
    expect(t('=IF(M6="Delivered",K6,0)', inRow(orders, 5))).toEqual({ ok: true, formula: 'IF({Status} = "Delivered", {Total}, 0)' })
    expect(t('=ROUND(K6/3,2)', inRow(orders, 5))).toEqual({ ok: true, formula: 'ROUND({Total} / 3, 2)' })
    expect(t('=CONCATENATE(M6," ",K6)', inRow(orders, 5))).toEqual({ ok: true, formula: 'CONCAT({Status}, " ", {Total})' })
    expect(t('=-H6^2', inRow(orders, 5))).toEqual({ ok: true, formula: '-{Subtotal} ^ 2' })
    expect(t('=H6-(I6-J6)', inRow(orders, 5))).toEqual({ ok: true, formula: '{Subtotal} - ({Delivery} - {Discount})' })
  })
  it('a row range inside SUM becomes the list of columns', () => {
    expect(t('=SUM(H6:J6)', inRow(orders, 5))).toEqual({ ok: true, formula: 'SUM({Subtotal}, {Delivery}, {Discount})' })
    expect(t('=SUM(H6:L6)', inRow(orders, 5))).toMatchObject({ ok: false })
  })
  it('"Not paid yet" in a column that became a link means nobody', () => {
    expect(t('=IF(H7="Not paid yet","Due","Paid")', inRow(costs, 6))).toEqual({ ok: true, formula: 'IF({Paid by} = "", "Due", "Paid")' })
    expect(t('=IF(H7<>"Not paid yet","Paid","Due")', inRow(costs, 6))).toEqual({ ok: true, formula: 'IF({Paid by} <> "", "Paid", "Due")' })
    expect(t('=IF(H7="Someone","Due","Paid")', inRow(costs, 6))).toEqual({ ok: true, formula: 'IF({Paid by} = "Someone", "Due", "Paid")' })
  })
  it('refuses another row, a loose cell, a lookup and unknown functions, saying why', () => {
    expect(t('=K6+H7', inRow(orders, 6))).toEqual({ ok: false, reason: 'uses another row of the same table (a running total or "previous row")' })
    expect(t('=H6*$B$1', inRow(orders, 5))).toMatchObject({ ok: false, reason: expect.stringContaining('outside the tables') })
    expect(t('=VLOOKUP(M6,Costs!B:G,6,0)', inRow(orders, 5))).toEqual({ ok: false, reason: 'uses a lookup (VLOOKUP)' })
    expect(t('=NOW()', inRow(orders, 5))).toEqual({ ok: false, reason: 'uses NOW()' })
    expect(t('=FOO(H6)', inRow(orders, 5))).toEqual({ ok: false, reason: 'uses FOO, which is not available yet' })
    expect(t('=MyRate*H6', inRow(orders, 5))).toEqual({ ok: false, reason: 'uses the name “MyRate”' })
  })
})

describe('whole columns and other sheets', () => {
  it('a function row works on the whole column of its own table', () => {
    expect(t('=SUM(K6:K11)', underTable(orders))).toEqual({ ok: true, formula: 'SUM({Total})' })
    expect(t('=SUMIFS(K6:K11,M6:M11,"Delivered")', underTable(orders))).toEqual({ ok: true, formula: 'SUMIFS({Total}, {Status}, "Delivered")' })
    expect(t('=SUMIF(M:M,"Delivered",K:K)', underTable(orders))).toEqual({ ok: true, formula: 'SUMIF({Status}, "Delivered", {Total})' })
  })
  it('other sheets become Table[Column]', () => {
    expect(t('=SUMIFS(Costs!G:G,Costs!H:H,"Shahidul Alam")', underTable(orders))).toEqual({ ok: true, formula: 'SUMIFS(Costs[Total], Costs[Paid by], "Shahidul Alam")' })
    expect(t("=SUM(Costs!G6:G17)", inRow(orders, 5))).toEqual({ ok: true, formula: 'SUM(Costs[Total])' })
  })
  it('a crosstab formula: the criteria are the cell beside it and the heading above', () => {
    const report: TableRegion = { name: 'Owner Payments', sheet: 'Owner Payments', headerRow: 4, firstRow: 5, lastRow: 5, cols: cols([['B', 'Paid by'], ['C', 'SAM-Trek Services'], ['D', 'Product Cost']]) }
    const e2 = { ...env, tables: [...env.tables, report] }
    const origin: Origin = { sheet: 'Owner Payments', row: 5, col: 3, table: report, mode: 'row' }
    expect(translate(parseExcel('=SUMIFS(Costs!G:G,Costs!H:H,B6,Costs!B:B,D$5)'), origin, e2)).toEqual({
      ok: true,
      formula: 'SUMIFS(Costs[Total], Costs[Paid by], {Paid by}, Costs[Category], "Product Cost")',
    })
  })
  it('a range outside the table, or several columns, is refused', () => {
    expect(t('=SUM(K20:K30)', underTable(orders))).toMatchObject({ ok: false, reason: expect.stringContaining('outside') })
    expect(t('=SUM(H6:K11)', underTable(orders))).toMatchObject({ ok: false, reason: expect.stringContaining('several columns') })
  })
})
