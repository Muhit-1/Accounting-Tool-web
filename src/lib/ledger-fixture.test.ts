/// <reference types="node" />
// The whole import path on a stand-in for the owner's Shopnojhuri_Ledger.xlsx
// (built from the prototype's example data, same sheets and block layout):
// read the file, find the sheets, read the blocks, check every row.
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { CASHBOOK_TABLE, categoriesToCreate, checkCashbookRows, summarizeCashbookRows, type CashbookImportRow } from './cashbook-import'
import { guessMapping, guessTable, sourceRows } from './sheet-import'
import { findFileTotals, segmentGrid } from './sheet-segments'
import { checkWorkbookFile, readWorkbook } from './workbook'

const bytes = new Uint8Array(readFileSync(new URL('./__fixtures__/shopnojhuri-ledger.xlsx', import.meta.url)))

function load() {
  const result = readWorkbook(XLSX, bytes)
  if (!result.ok) throw new Error(result.message)
  return result.sheets
}

describe('the ledger workbook', () => {
  it('passes the file checks', () => {
    expect(checkWorkbookFile({ name: 'Shopnojhuri_Ledger.xlsx', size: bytes.length }, bytes)).toBeNull()
  })

  it('has the six sheets of the real workbook, dates read as dates', () => {
    const sheets = load()
    expect(sheets.map((s) => s.name)).toEqual(['Guide', 'Fund Ledger', 'Orders', 'Costs', 'Owner Payments', 'Monthly View'])
    const firstDated = sheets[1].rows.find((r) => r.cells.includes('Initial payment for buying product'))
    expect(firstDated?.cells[1]).toBe('2026-05-11')
    expect(firstDated?.links[4]).toBe('https://drive.example.com/proof-1')
    expect(firstDated?.cells[5]).toBe('5000')
  })

  it('only the Fund Ledger is offered as a Cash book table; derived and other sheets are left out', () => {
    const sheets = load()
    const guesses = Object.fromEntries(sheets.map((sheet) => [sheet.name, guessTable(sheet, segmentGrid(sheet, CASHBOOK_TABLE), [CASHBOOK_TABLE]).tableKey]))
    expect(guesses).toEqual({ Guide: null, 'Fund Ledger': 'cashbook', Orders: null, Costs: null, 'Owner Payments': null, 'Monthly View': null })
  })

  it('finds the totals the sheet says it adds up to', () => {
    const ledger = load()[1]
    expect(findFileTotals(ledger.rows)).toEqual({ moneyIn: 46966, moneyOut: 46041, balance: 925 })
  })

  it('reads the six blocks with their headings and directions', () => {
    const ledger = load()[1]
    const segments = segmentGrid(ledger, CASHBOOK_TABLE)
    expect(segments.map((s) => [s.heading, s.direction, s.rows.length])).toEqual([
      ['Client money received', 'in', 6],
      ['Orders', 'in', 2],
      ['Refunds & other income', 'in', 1],
      ['Product purchase', 'out', 6],
      ['Overhead costs', 'out', 6],
      ['Orders paid from fund', 'out', 2],
    ])
  })

  it('dry run: the Cash book rows add up as the sheet does (the 100 from the Orders sheet is posted by the app)', () => {
    const ledger = load()[1]
    const segments = segmentGrid(ledger, CASHBOOK_TABLE)
    const mapping = guessMapping(segments, CASHBOOK_TABLE.targets)
    expect(mapping).toMatchObject({ date: 'date', description: 'desc', type: 'cat', proof: 'proof', 'amount bdt': 'amt' })
    expect(mapping.note).toBeNull()

    const source = sourceRows(ledger, segments, mapping)
    const skipped = source.filter((row) => row.skip)
    expect(skipped.map((row) => row.skip)).toEqual(['Worked out by your sheet', 'Worked out by your sheet'])

    const checked = checkCashbookRows(
      source.filter((row) => !row.skip).map((row) => row.values),
      [],
      { createCategories: true },
    )
    expect(checked.filter((c) => c.check.status !== 'ok')).toEqual([])
    const rows = checked.map((c) => (c.check.status === 'ok' ? c.check.row : null)) as CashbookImportRow[]
    expect(rows).toHaveLength(21)
    const totals = summarizeCashbookRows(rows)
    expect(totals).toEqual({ moneyIn: 46866, moneyOut: 46041 })
    // + the delivered order SJ-0002 (100) from the Orders sheet = the sheet's own 46,966 in, 925 balance.
    expect(totals.moneyIn + 100).toBe(46966)
    expect(totals.moneyIn + 100 - totals.moneyOut).toBe(925)
  })

  it('files each block under its heading, or under the row\'s own Type', () => {
    const ledger = load()[1]
    const segments = segmentGrid(ledger, CASHBOOK_TABLE)
    const source = sourceRows(ledger, segments, guessMapping(segments, CASHBOOK_TABLE.targets)).filter((row) => !row.skip)
    const rows = checkCashbookRows(source.map((row) => row.values), [], { createCategories: true }).map((c) => (c.check.status === 'ok' ? c.check.row : null)) as CashbookImportRow[]
    expect(categoriesToCreate(rows).map((c) => `${c.name}:${c.type}`)).toEqual([
      'Client money received:INCOME',
      'Orders:INCOME',
      'Refunds & other income:INCOME',
      'Product purchase:EXPENSE',
      'Transport:EXPENSE',
      'Photography & equipment:EXPENSE',
      'Packaging & stickers:EXPENSE',
      'Package test:EXPENSE',
      'Marketing / ads:EXPENSE',
      'Orders paid from fund:EXPENSE',
    ])
    expect(rows[0].entry.proofUrl).toBe('https://drive.example.com/proof-1')
    expect(rows.find((r) => r.memo === 'Transportation')?.entry.proofUrl).toBeUndefined()
  })

  it('without "create categories", every row of a new business has a problem to fix', () => {
    const ledger = load()[1]
    const segments = segmentGrid(ledger, CASHBOOK_TABLE)
    const source = sourceRows(ledger, segments, guessMapping(segments, CASHBOOK_TABLE.targets)).filter((row) => !row.skip)
    const checked = checkCashbookRows(source.map((row) => row.values), [], { createCategories: false })
    expect(checked.every((c) => c.check.status === 'error')).toBe(true)
  })
})
