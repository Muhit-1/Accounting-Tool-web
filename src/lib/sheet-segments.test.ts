import { describe, expect, it } from 'vitest'
import { CASHBOOK_TABLE } from './cashbook-import'
import { categoryOfHeading, directionOfHeading, findFileTotals, segmentGrid, skipReason, type SheetGrid, type SheetRow } from './sheet-segments'

const row = (rowNumber: number, ...cells: string[]): SheetRow => ({ cells, links: cells.map(() => null), rowNumber })

describe('directionOfHeading', () => {
  it.each([
    ['1.  CLIENT MONEY RECEIVED   (money in)', 'in'],
    ['4.  PRODUCT PURCHASE   (money out)', 'out'],
    ['2.  ORDERS   (money in)  –  one total for all delivered orders', 'in'],
    ['Refunds', 'in'],
    ['Overhead costs', 'out'],
    ['Notes', null],
  ])('%s -> %s', (heading, direction) => {
    expect(directionOfHeading(heading)).toBe(direction)
  })
})

describe('categoryOfHeading', () => {
  it.each([
    ['1.  CLIENT MONEY RECEIVED   (money in)', 'Client money received'],
    ['2.  ORDERS   (money in)  –  one total for all delivered orders', 'Orders'],
    ['3.  REFUNDS & OTHER INCOME   (money in)', 'Refunds & other income'],
    ['5.  OVERHEAD COSTS   (money out)  –  photography, package test, packaging, transport ...', 'Overhead costs'],
    ['Product Purchase', 'Product Purchase'],
    ['6) Orders paid from fund', 'Orders paid from fund'],
  ])('%s -> %s', (heading, category) => {
    expect(categoryOfHeading(heading)).toBe(category)
  })
})

describe('skipReason', () => {
  it('skips rows the sheet works out by itself and total lines', () => {
    expect(skipReason(row(1, '', 'All delivered orders', 'automatic', '', '100'))).toBe('Worked out by your sheet')
    expect(skipReason(row(1, '', 'Total money in', '', '', '46966'))).toBe('A total line')
    expect(skipReason(row(1, 'Subtotal', '', '5'))).toBe('A total line')
  })
  it('keeps ordinary rows, even ones that mention automatic or total inside a sentence', () => {
    expect(skipReason(row(1, '2026-05-11', 'Total rebuild of the site', '', '', '5000'))).toBeNull()
    expect(skipReason(row(1, '2026-05-11', 'Automatic gate repair', '', '', '5000'))).toBeNull()
  })
})

describe('segmentGrid', () => {
  const sheet: SheetGrid = {
    name: 'Fund Ledger',
    rows: [
      row(1, 'Title of the sheet'),
      row(8, '', 'FUND STATEMENT'),
      row(9, '', 'Category', '', '', 'Entries', 'Amount (BDT)'),
      row(10, '', 'Client money received', '', '', '6', '44200'),
      row(30, '', '1.  CLIENT MONEY RECEIVED   (money in)', '', '', 'Subtotal', '44200'),
      row(31, '', 'Date', 'Description', 'Note', 'Proof', 'Amount (BDT)'),
      row(32, '', '2026-05-11', 'Initial payment', '', 'View proof', '5000'),
      row(33, '', '2026-05-23', 'Due payment', '', 'View proof', '15000'),
      row(56, '', '5.  OVERHEAD COSTS   (money out)', '', '', 'Subtotal', '8630'),
      row(57, '', 'Date', 'Description', 'Type', 'Proof', 'Amount (BDT)'),
      row(58, '', '2026-05-23', 'Transportation', 'Transport', '', '250'),
    ],
  }

  it('finds each block with its heading, direction and rows', () => {
    const segments = segmentGrid(sheet, CASHBOOK_TABLE)
    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({ heading: 'Client money received', direction: 'in', synthetic: false })
    expect(segments[0].rows.map((r) => r.rowNumber)).toEqual([32, 33])
    expect(segments[1]).toMatchObject({ heading: 'Overhead costs', direction: 'out' })
    expect(segments[1].rows.map((r) => r.rowNumber)).toEqual([58])
  })

  it('does not take the statement lines for a block (one matching column is not a header row)', () => {
    const segments = segmentGrid(sheet, CASHBOOK_TABLE)
    expect(segments.every((segment) => segment.rows.every((r) => r.rowNumber > 31))).toBe(true)
  })

  it('does not hand the next block\'s heading to the block before it', () => {
    const segments = segmentGrid(sheet, CASHBOOK_TABLE)
    expect(segments[0].rows.some((r) => r.cells.join(' ').includes('OVERHEAD'))).toBe(false)
  })

  it('a plain table has no heading and every row after the header', () => {
    const plain: SheetGrid = {
      name: 'Export',
      rows: [row(1, 'Date', 'What for', 'In', 'Out'), row(2, '1 May 2026', 'Sale', '500', ''), row(3, '2 May 2026', 'Rent', '', '300')],
    }
    const [segment] = segmentGrid(plain, CASHBOOK_TABLE)
    expect(segment).toMatchObject({ heading: null, direction: null, synthetic: false })
    expect(segment.rows).toHaveLength(2)
  })

  it('a table\'s last data row is not taken for a heading', () => {
    const plain: SheetGrid = {
      name: 'x',
      rows: [row(1, 'Date', 'Description', 'Amount'), row(2, '1 May 2026', 'Sale', '500'), row(3, 'Date', 'Description', 'Amount'), row(4, '2 May 2026', 'Sale', '5')],
    }
    const segments = segmentGrid(plain, CASHBOOK_TABLE)
    expect(segments.map((s) => s.heading)).toEqual([null, null])
    expect(segments[0].rows).toHaveLength(1)
  })

  it('a sheet with no header row is one table with made-up column names', () => {
    const bare: SheetGrid = { name: 'x', rows: [row(1, '1 May 2026', 'Sale', '500')] }
    const [segment] = segmentGrid(bare, CASHBOOK_TABLE)
    expect(segment).toMatchObject({ synthetic: true, headers: ['Column 1', 'Column 2', 'Column 3'] })
  })

  it('an empty sheet has nothing', () => {
    expect(segmentGrid({ name: 'x', rows: [] }, CASHBOOK_TABLE)).toEqual([])
  })
})

describe('findFileTotals', () => {
  it('reads a tile (number under the label) and a statement line (number to the right)', () => {
    const rows = [
      row(4, '', 'TOTAL MONEY IN', '', 'TOTAL MONEY OUT', '', 'FUND BALANCE'),
      row(5, '', '46966', '', '46041', '', '925'),
    ]
    expect(findFileTotals(rows)).toEqual({ moneyIn: 46966, moneyOut: 46041, balance: 925 })
    expect(findFileTotals([row(14, '', 'TOTAL MONEY IN', '', '', '', '46,966.00'), row(26, '', 'FUND BALANCE   (money in − money out)', '', '', '', '925')])).toEqual({
      moneyIn: 46966,
      balance: 925,
    })
  })
  it('finds nothing when the sheet has no totals', () => {
    expect(findFileTotals([row(1, 'Date', 'Amount')])).toEqual({})
  })
})
