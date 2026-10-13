/// <reference types="node" />
import { readFileSync } from 'node:fs'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import {
  COSTS_TABLE,
  COST_TARGETS,
  checkCostRows,
  costCashbookTotals,
  costKey,
  costTotals,
  existingCostKeys,
  partnersToCreate,
  type CostImportRow,
} from './costs-import'
import { checkPlans, planColumns, planSheets } from './import-plan'
import { markDuplicates, parseDelimited, prepareRows, rowValues, runnerOf } from './paste-import'
import { CASHBOOK_TABLE } from './cashbook-import'
import { ORDERS_TABLE } from './orders-import'
import { readWorkbook } from './workbook'
import type { CostItem } from '../types/api'

const PARTNERS = [{ id: 'p1', name: 'Shahidul Alam' }]
const good = { group: 'Overhead Cost', item: 'Internet', rate: '1,200', months: '3' }

function rows(list: Record<string, string>[], options = { createCategories: false }, partners = PARTNERS) {
  return checkCostRows(list, partners, options)
}
const ok = (values: Record<string, string>, options = { createCategories: false }) => {
  const [result] = rows([values], options)
  if (result.check.status !== 'ok') throw new Error(JSON.stringify(result.check))
  return result.check.row
}

describe('checkCostRows', () => {
  it('turns a good row into a cost; the total is worked out like the server does', () => {
    expect(ok(good)).toMatchObject({ total: 3600, paidFrom: 'NONE', cost: { groupName: 'Overhead Cost', item: 'Internet', monthlyRate: 1200, months: 3, oneTime: 0, partnerId: null } })
    expect(ok({ item: 'Sign', oneTime: '4,500' }).cost.groupName).toBe('Other')
    expect(ok({ ...good, oneTime: '100' }).total).toBe(3700)
  })

  it('reads Paid by: nobody, Business money, or a listed partner', () => {
    expect(ok({ ...good, paidBy: 'Not paid yet' }).paidFrom).toBe('NONE')
    expect(ok({ ...good, paidBy: '' }).paidFrom).toBe('NONE')
    expect(ok({ ...good, paidBy: 'The Fund' }).paidFrom).toBe('BUSINESS')
    expect(ok({ ...good, paidBy: 'Business money' }).paidFrom).toBe('BUSINESS')
    expect(ok({ ...good, paidBy: 'shahidul alam' })).toMatchObject({ paidFrom: 'PARTNER', cost: { partnerId: 'p1' }, newPartner: null })
  })

  it('an unlisted partner is a problem, unless partners may be created', () => {
    expect(rows([{ ...good, paidBy: 'Sumon' }])[0].check).toEqual({
      status: 'error',
      message: 'Paid by: “Sumon” is not a partner. Add it in Settings, or tick “Create partners”.',
    })
    expect(ok({ ...good, paidBy: 'Sumon' }, { createCategories: true })).toMatchObject({ paidFrom: 'PARTNER', newPartner: 'Sumon' })
  })

  it('makes each new partner once', () => {
    const ready = rows([{ ...good, paidBy: 'Sumon' }, { ...good, item: 'b', paidBy: 'SUMON' }, { ...good, item: 'c', paidBy: 'Rina' }], { createCategories: true }).map((r) =>
      r.check.status === 'ok' ? r.check.row : null,
    ) as CostImportRow[]
    expect(partnersToCreate(ready)).toEqual(['Sumon', 'Rina'])
  })

  it.each([
    [{ ...good, item: '' }, 'Item: type what the cost is for.'],
    [{ item: 'x' }, 'This cost has no amount. Fill the rate and months, or the one-time amount.'],
    [{ item: 'x', rate: '500' }, 'This cost has no amount. Fill the rate and months, or the one-time amount.'],
    [{ ...good, rate: 'abc' }, 'Monthly rate: Type a number, like 1,250.'],
    [{ ...good, months: '2.5' }, 'Months: Type a whole number from 0 to 600.'],
    [{ ...good, paidOn: '1 Oct 2026' }, 'Paid on: choose who paid it first.'],
    [{ ...good, paidBy: 'Business money', paidOn: 'x' }, 'Paid on: use a date like 12 Oct 2026.'],
    [{ ...good, paidBy: 'Business money', paidOn: '1 Jan 2099' }, "Entries can't be dated in the future."],
  ])('refuses %j', (values, message) => {
    expect(rows([values])[0].check).toEqual({ status: 'error', message })
  })

  it('only costs paid from Business money move the Cash book', () => {
    const ready = [ok({ ...good, paidBy: 'Business money' }), ok({ ...good, paidBy: 'Shahidul Alam' }), ok(good)]
    expect(costCashbookTotals(ready)).toEqual({ moneyIn: 0, moneyOut: 3600 })
    expect(costTotals(ready)).toEqual({ total: 10800, paid: 7200, due: 3600 })
  })

  it('the same cost again (group, item, total) is already there', () => {
    const existing = [{ groupName: 'overhead cost', item: 'INTERNET', total: 3600 }] as CostItem[]
    expect(markDuplicates(rows([good, { ...good, rate: '1,300' }]), existingCostKeys(existing)).map((r) => r.status)).toEqual(['duplicate', 'ok'])
    expect(costKey('', 'x', 5)).toBe('other|x|5.00')
  })
})

describe('a pasted block of costs', () => {
  it('matches the header by name, however the old sheet named its columns', () => {
    const block = ['Category\tItem\tMonthly Rate (BDT)\tMonths\tOne-time Amount (BDT)\tPaid By', 'Overhead Cost\tInternet\t1,200\t3\t\tNot paid yet'].join('\n')
    const prepared = prepareRows(parseDelimited(block), COST_TARGETS)
    expect(prepared.mapping).toEqual(['group', 'item', 'rate', 'months', 'oneTime', 'paidBy'])
    expect(ok(rowValues(prepared.rows[0], prepared.mapping)).total).toBe(3600)
  })
})

describe('the ledger workbook: Costs sheet', () => {
  const bytes = new Uint8Array(readFileSync(new URL('./__fixtures__/shopnojhuri-ledger.xlsx', import.meta.url)))
  const read = readWorkbook(XLSX, bytes)
  if (!read.ok) throw new Error(read.message)
  const tables = [CASHBOOK_TABLE, ORDERS_TABLE, COSTS_TABLE]
  const plans = planSheets(read.sheets, tables)

  it('goes to Costs; the sheet\'s own total and status columns are left out', () => {
    expect(plans.find((p) => p.sheet.name === 'Costs')?.tableKey).toBe('costs')
    expect(Object.fromEntries(planColumns(plans.find((p) => p.sheet.name === 'Costs')!).map((c) => [c.header, c.targetId]))).toMatchObject({
      Category: 'group',
      Item: 'item',
      'Monthly Rate (BDT)': 'rate',
      Months: 'months',
      'One-time Amount (BDT)': 'oneTime',
      'Total Cost (BDT)': null,
      'Paid By': 'paidBy',
      Status: null,
      Notes: 'notes',
      'Due #': null,
    })
  })

  it('12 costs: total 201,254 · paid 82,254 · still due 119,000; the two partners are made', () => {
    const runner = runnerOf<CostImportRow>(
      {
        noun: 'costs',
        singular: 'cost',
        title: 'Costs',
        targets: COST_TARGETS,
        offersNewCategories: true,
        newItemsNoun: 'partners',
        existing: new Map(),
        check: (list, options) => checkCostRows(list, [], options),
        commit: async (r) => ({ batchId: 'c', created: r.length }),
        undo: async () => undefined,
      },
      costCashbookTotals,
    )
    const checks = checkPlans(plans, tables, { cashbook: runner, orders: runner, costs: runner }, { createCategories: true })
    const costs = checks.find((c) => c.tableKey === 'costs')!
    expect(costs.counts).toEqual({ ready: 12, duplicate: 0, problem: 0, skipped: 0 })
    const ready = costs.ready as CostImportRow[]
    expect(costTotals(ready)).toEqual({ total: 201254, paid: 82254, due: 119000 })
    expect(partnersToCreate(ready)).toEqual(['Shahidul Alam', 'Md Hifzur Rahman Sumon'])
    // none is paid from Business money, so the Cash book is untouched
    expect(costs.readyTotals).toEqual({ moneyIn: 0, moneyOut: 0 })
  })
})
