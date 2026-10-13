// Paste / import rules for Costs: one row of cells becomes one cost, or a
// plain-words reason why not. The server works out every total, numbers the
// costs and checks everything again.
import { MAX_GROUP, MAX_ITEM, MAX_MONTHS, MAX_NOTES, costTotal, DEFAULT_GROUP } from './costs-grid'
import type { CostInput } from './costs'
import { futureDateError, parseDateInput, parseMoneyInput, parseWholeNumber } from './grid-parse'
import { sumMoney } from './grid-rows'
import { countKeys, type ImportTarget, type MoneyTotals, type RowCheck } from './paste-import'
import type { ImportTableInfo } from './sheet-import'
import type { CostItem, CostPaidFrom, Partner } from '../types/api'

export const COST_TARGETS: ImportTarget[] = [
  { id: 'group', label: 'Group', synonyms: ['category', 'type'] },
  { id: 'item', label: 'Item', synonyms: ['description', 'cost', 'what for'] },
  { id: 'rate', label: 'Monthly rate', synonyms: ['monthly rate bdt', 'rate', 'monthly'] },
  { id: 'months', label: 'Months', synonyms: ['month'] },
  { id: 'oneTime', label: 'One-time', synonyms: ['one time amount bdt', 'one time amount', 'one time', 'amount'] },
  { id: 'paidBy', label: 'Paid by', synonyms: ['who paid'] },
  { id: 'paidOn', label: 'Paid on', synonyms: ['paid date'] },
  { id: 'notes', label: 'Notes', synonyms: ['note', 'remarks'] },
]

export const COSTS_TABLE: ImportTableInfo = {
  key: 'costs',
  label: 'Costs',
  targets: COST_TARGETS,
  nameHint: /cost/i,
  isMatch: (matched) => matched.has('item') && (matched.has('rate') || matched.has('oneTime') || matched.has('months')),
}

export interface CostImportRow {
  cost: CostInput
  total: number
  paidFrom: CostPaidFrom
  // A partner that has to be made first, when the row's one is not listed yet.
  newPartner: string | null
}

const lower = (text: string) => text.trim().toLowerCase()

const NOT_PAID = new Set(['', 'not paid yet', 'not paid', 'due', 'unpaid', 'no one', 'nobody'])
const BUSINESS_MONEY = new Set(['business money', 'business', 'fund', 'the fund', 'business money → cash book', 'cash book', 'company'])

// The same cost again: same group, item and total.
export function costKey(group: string, item: string, total: number): string {
  return `${lower(group || DEFAULT_GROUP)}|${lower(item)}|${total.toFixed(2)}`
}

export function existingCostKeys(costs: CostItem[]): Map<string, number> {
  return countKeys(costs.map((cost) => costKey(cost.groupName, cost.item, cost.total)))
}

export interface CostCheckOptions {
  // Add the partner a row names when nobody of that name is listed yet.
  createCategories: boolean
}

export function checkCostRows(
  list: Record<string, string>[],
  partners: Pick<Partner, 'id' | 'name'>[],
  options: CostCheckOptions,
): { check: RowCheck<CostImportRow>; key: string | null }[] {
  const byName = new Map(partners.map((partner) => [lower(partner.name), partner]))
  return list.map((values) => {
    const fail = (message: string) => ({ check: { status: 'error', message } as RowCheck<CostImportRow>, key: null })

    const item = (values.item ?? '').trim()
    if (item === '') return fail('Item: type what the cost is for.')
    if (item.length > MAX_ITEM) return fail(`Item: too long (max ${MAX_ITEM} characters).`)
    const group = (values.group ?? '').trim() || DEFAULT_GROUP
    if (group.length > MAX_GROUP) return fail(`Group: too long (max ${MAX_GROUP} characters).`)

    const rate = parseMoneyInput(values.rate ?? '')
    if (rate.kind === 'error') return fail(`Monthly rate: ${rate.message}`)
    const oneTime = parseMoneyInput(values.oneTime ?? '')
    if (oneTime.kind === 'error') return fail(`One-time: ${oneTime.message}`)
    const months = parseWholeNumber(values.months ?? '', MAX_MONTHS)
    if (months.kind === 'error') return fail(`Months: ${months.message}`)
    const monthlyRate = rate.kind === 'ok' ? rate.value : 0
    const monthCount = months.kind === 'ok' ? months.value : 0
    const once = oneTime.kind === 'ok' ? oneTime.value : 0
    const total = costTotal(monthlyRate, monthCount, once)
    if (total <= 0) return fail('This cost has no amount. Fill the rate and months, or the one-time amount.')

    const paidByText = (values.paidBy ?? '').trim()
    let paidFrom: CostPaidFrom = 'NONE'
    let partnerId: string | null = null
    let newPartner: string | null = null
    if (NOT_PAID.has(lower(paidByText))) {
      paidFrom = 'NONE'
    } else if (BUSINESS_MONEY.has(lower(paidByText))) {
      paidFrom = 'BUSINESS'
    } else {
      paidFrom = 'PARTNER'
      const partner = byName.get(lower(paidByText))
      if (partner) partnerId = partner.id
      else if (options.createCategories) {
        if (paidByText.length > 60) return fail('Paid by: the name is too long (max 60 characters).')
        newPartner = paidByText
      } else return fail(`Paid by: “${paidByText}” is not a partner. Add it in Settings, or tick “Create partners”.`)
    }

    let paidOn: string | null = null
    if ((values.paidOn ?? '').trim() !== '') {
      if (paidFrom === 'NONE') return fail('Paid on: choose who paid it first.')
      const iso = parseDateInput(values.paidOn ?? '')
      if (!iso) return fail('Paid on: use a date like 12 Oct 2026.')
      const future = futureDateError(iso)
      if (future) return fail(future)
      paidOn = iso
    }
    const notes = (values.notes ?? '').trim()
    if (notes.length > MAX_NOTES) return fail(`Notes: too long (max ${MAX_NOTES} characters).`)

    const cost: CostInput = {
      groupName: group,
      item,
      monthlyRate,
      months: monthCount,
      oneTime: once,
      paidFrom,
      partnerId,
      paidOn,
      notes: notes === '' ? null : notes,
    }
    return { check: { status: 'ok', row: { cost, total, paidFrom, newPartner } }, key: costKey(group, item, total) }
  })
}

// Costs paid from Business money post expense entries to the Cash book.
export function costCashbookTotals(rows: CostImportRow[]): MoneyTotals {
  return { moneyIn: 0, moneyOut: sumMoney(rows.filter((row) => row.paidFrom === 'BUSINESS').map((row) => row.total)) }
}

export function costTotals(rows: CostImportRow[]): { total: number; paid: number; due: number } {
  const total = sumMoney(rows.map((row) => row.total))
  const due = sumMoney(rows.filter((row) => row.paidFrom === 'NONE').map((row) => row.total))
  return { total, due, paid: sumMoney([total, -due]) }
}

export function partnersToCreate(rows: CostImportRow[]): string[] {
  const seen = new Map<string, string>()
  for (const row of rows) if (row.newPartner && !seen.has(lower(row.newPartner))) seen.set(lower(row.newPartner), row.newPartner)
  return [...seen.values()]
}
