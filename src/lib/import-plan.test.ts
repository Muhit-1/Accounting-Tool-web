/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { CASHBOOK_TABLE, checkCashbookRows, existingCashbookKeys, moneyOfValues, summarizeCashbookRows, type CashbookImportRow } from './cashbook-import'
import { cashbookAfter, checkPlans, planColumns, planSheets, withMapping, withTable } from './import-plan'
import { ORDERS_TABLE, checkOrderRows, existingOrderKeys, orderCashbookTotals, summarizeOrderRows, type OrderImportRow } from './orders-import'
import { runnerOf } from './paste-import'
import { readWorkbook } from './workbook'
import type { Category, Transaction } from '../types/api'

const bytes = new Uint8Array(readFileSync(new URL('./__fixtures__/shopnojhuri-ledger.xlsx', import.meta.url)))
const read = readWorkbook(XLSX, bytes)
if (!read.ok) throw new Error(read.message)
const sheets = read.sheets
const TABLES = [CASHBOOK_TABLE]

function cashbookRunner(categories: Category[] = [], transactions: Transaction[] = []) {
  return runnerOf<CashbookImportRow>(
    {
      noun: 'entries',
      singular: 'entry',
      title: 'Cash book',
      targets: CASHBOOK_TABLE.targets,
      offersNewCategories: true,
      existing: existingCashbookKeys(transactions),
      check: (list, options) => checkCashbookRows(list, categories, options),
      summarize: (rows) => {
        const totals = summarizeCashbookRows(rows)
        return `${totals.moneyIn} in, ${totals.moneyOut} out`
      },
      commit: async (rows) => ({ batchId: 'b', created: rows.length }),
      undo: async () => undefined,
    },
    summarizeCashbookRows,
    moneyOfValues,
  )
}

const OPTIONS = { createCategories: true }

describe('planSheets', () => {
  it('sends the Fund Ledger to the Cash book and leaves the rest', () => {
    const plans = planSheets(sheets, TABLES)
    expect(plans.map((p) => [p.sheet.name, p.tableKey])).toEqual([
      ['Guide', null],
      ['Fund Ledger', 'cashbook'],
      ['Orders', null],
      ['Costs', null],
      ['Owner Payments', null],
      ['Monthly View', null],
    ])
    expect(plans[0].reason).toBeTruthy()
    expect(plans[4].reason).toMatch(/works this out itself/)
  })

  it('matches the Fund Ledger columns by their words', () => {
    const plan = planSheets(sheets, TABLES)[1]
    const columns = planColumns(plan)
    expect(columns.map((c) => [c.header, c.targetId])).toEqual([
      ['Date', 'date'],
      ['Description', 'desc'],
      ['Note', null],
      ['Proof', 'proof'],
      ['Amount (BDT)', 'amt'],
      ['Type', 'cat'],
    ])
    expect(columns.find((c) => c.header === 'Amount (BDT)')?.example).toBe('5000')
  })
})

describe('changing the plan', () => {
  it('a sheet can be sent to a table by hand, or skipped', () => {
    const [guide] = planSheets(sheets, TABLES)
    expect(withTable(guide, null, TABLES).reason).toBe('You chose to skip it')
    const forced = withTable(planSheets(sheets, TABLES)[1], 'cashbook', TABLES)
    expect(forced.segments).toHaveLength(6)
  })

  it('matching a column releases the one that had it', () => {
    const plan = planSheets(sheets, TABLES)[1]
    const changed = withMapping(plan, 'note', 'desc')
    expect(changed.mapping.note).toBe('desc')
    expect(changed.mapping.description).toBeNull()
    expect(withMapping(changed, 'note', null).mapping.note).toBeNull()
  })
})

describe('checkPlans — the ledger dry run', () => {
  const plans = planSheets(sheets, TABLES)
  const [check] = checkPlans(plans, TABLES, { cashbook: cashbookRunner() }, OPTIONS)

  it('reads 21 entries and leaves out the two lines the sheet works out itself', () => {
    expect(check.counts).toEqual({ ready: 21, duplicate: 0, problem: 0, skipped: 2 })
    expect(check.skipped.map((s) => [s.sheetName, s.reason])).toEqual([
      ['Fund Ledger', 'Worked out by your sheet'],
      ['Fund Ledger', 'Worked out by your sheet'],
    ])
    expect(check.tooMany).toBeNull()
  })

  it('adds up to the sheet\'s money in and out; the 100 left out is its Orders total', () => {
    expect(check.readyTotals).toEqual({ moneyIn: 46866, moneyOut: 46041 })
    expect(check.summary).toBe('46866 in, 46041 out')
    expect(check.comparisons).toHaveLength(1)
    const [comparison] = check.comparisons
    expect(comparison.file).toEqual({ moneyIn: 46966, moneyOut: 46041, balance: 925 })
    expect(comparison.rows).toEqual({ moneyIn: 46866, moneyOut: 46041 })
    expect(comparison.leftOut).toEqual({ moneyIn: 100, moneyOut: 0 })
    expect(comparison.matches).toBe(true)
  })

  it('a second run of the same file finds everything already there', () => {
    const [again] = checkPlans(plans, TABLES, { cashbook: cashbookRunner(categoriesFor(check.ready as CashbookImportRow[]), transactionsFor(check.ready as CashbookImportRow[])) }, OPTIONS)
    expect(again.counts).toMatchObject({ ready: 0, duplicate: 21, problem: 0 })
    // duplicates still count towards "what the sheet says", so the totals comparison still holds
    expect(again.comparisons[0].rows).toEqual({ moneyIn: 46866, moneyOut: 46041 })
    expect(again.comparisons[0].matches).toBe(true)
  })

  it('without "create categories", rows of unknown categories are problems with their sheet row number', () => {
    const [strict] = checkPlans(plans, TABLES, { cashbook: cashbookRunner() }, { createCategories: false })
    expect(strict.counts.ready).toBe(0)
    expect(strict.counts.problem).toBe(21)
    expect(strict.problems[0]).toMatchObject({ sheetName: 'Fund Ledger', rowNumber: 32, message: 'Category “Client money received” doesn\'t exist.' })
  })

  it('a sheet sent to Skip contributes nothing', () => {
    const skipped = plans.map((plan) => withTable(plan, null, TABLES))
    expect(checkPlans(skipped, TABLES, { cashbook: cashbookRunner() }, OPTIONS)).toEqual([])
  })

  it('a changed total in the file shows as a mismatch', () => {
    const edited = structuredClone(plans)
    const ledger = edited[1].sheet
    const totalRow = ledger.rows.find((r) => r.cells.includes('TOTAL MONEY IN') && r.cells.includes('TOTAL MONEY OUT'))
    const valuesRow = ledger.rows[ledger.rows.indexOf(totalRow!) + 1]
    valuesRow.cells[1] = '50000'
    const [mismatch] = checkPlans(edited, TABLES, { cashbook: cashbookRunner() }, OPTIONS)
    expect(mismatch.comparisons[0].matches).toBe(false)
  })
})

// A stand-in for "the entries that import made", to run the same file again.
function categoriesFor(rows: CashbookImportRow[]): Category[] {
  const names = new Map<string, Category>()
  for (const row of rows) {
    const name = row.newCategory?.name
    if (name && !names.has(name.toLowerCase())) {
      names.set(name.toLowerCase(), { id: `id-${names.size}`, businessId: 'b', name, type: row.newCategory!.type, groupName: null, isSystem: false, createdAt: '' })
    }
  }
  return [...names.values()]
}

function transactionsFor(rows: CashbookImportRow[]): Transaction[] {
  return rows.map((row, index) => ({ id: `t${index}`, date: `${row.date}T00:00:00.000Z`, memo: row.memo, amount: row.amount, type: row.type }) as Transaction)
}


function ordersRunner() {
  return runnerOf<OrderImportRow>(
    {
      noun: 'orders',
      singular: 'order',
      title: 'Orders',
      targets: ORDERS_TABLE.targets,
      existing: existingOrderKeys([]),
      check: (list) => checkOrderRows(list),
      summarize: summarizeOrderRows,
      commit: async (rows) => ({ batchId: 'o', created: rows.length }),
      undo: async () => undefined,
    },
    orderCashbookTotals,
  )
}

describe('the whole workbook: Fund Ledger -> Cash book and Orders -> Orders', () => {
  const both = [CASHBOOK_TABLE, ORDERS_TABLE]
  const plans = planSheets(sheets, both)

  it('sends the Orders sheet to Orders and still leaves the Costs sheet alone', () => {
    expect(Object.fromEntries(plans.map((p) => [p.sheet.name, p.tableKey]))).toEqual({
      Guide: null,
      'Fund Ledger': 'cashbook',
      Orders: 'orders',
      Costs: null,
      'Owner Payments': null,
      'Monthly View': null,
    })
  })

  it('matches the order columns by name, leaving the own total and posting columns out', () => {
    const columns = planColumns(plans[2])
    const goes = Object.fromEntries(columns.map((c) => [c.header, c.targetId]))
    expect(goes).toMatchObject({
      'Order Date': 'orderDate',
      'Customer Name': 'customer',
      Phone: 'phone',
      'Email (optional)': 'email',
      'Delivery Address': 'address',
      'Items Ordered': 'items',
      'Items Subtotal (BDT)': 'subtotal',
      'Delivery Charge (BDT)': 'delivery',
      'Discount (BDT)': 'discount',
      'Order Total (BDT)': null,
      'Payment Method': 'payment',
      Status: 'status',
      'Fund Treatment': 'fund',
      'Delivery Date': 'deliveredOn',
      Notes: 'notes',
      'Order ID': null,
      'Fund Posting (auto)': null,
      'Counted on (auto)': null,
    })
  })

  it('dry run: money in 46,966, money out 46,041, balance 925', () => {
    const checks = checkPlans(plans, both, { cashbook: cashbookRunner(), orders: ordersRunner() }, OPTIONS)
    const orders = checks.find((c) => c.tableKey === 'orders')!
    expect(orders.counts).toEqual({ ready: 1, duplicate: 0, problem: 0, skipped: 0 })
    expect(orders.readyTotals).toEqual({ moneyIn: 100, moneyOut: 0 })
    const after = cashbookAfter(checks, { moneyIn: 0, moneyOut: 0 })
    expect(after).toEqual({ moneyIn: 46966, moneyOut: 46041, balance: 925 })
  })

  it('adds to what the Cash book already holds', () => {
    const checks = checkPlans(plans, both, { cashbook: cashbookRunner(), orders: ordersRunner() }, OPTIONS)
    expect(cashbookAfter(checks, { moneyIn: 1000, moneyOut: 200 })).toEqual({ moneyIn: 47966, moneyOut: 46241, balance: 1725 })
  })

  it('says nothing when no table moves money', () => {
    expect(cashbookAfter([], { moneyIn: 5, moneyOut: 1 })).toBeNull()
  })
})
