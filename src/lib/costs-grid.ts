// The rules of the Costs grid, apart from the screen: what an edited cell or
// the add-row turns into, and what is refused first with a plain message. The
// server works out every total and checks everything again.
import { sumMoney } from './grid-rows'
import { futureDateError, parseDateInput, parseMoneyInput, parseWholeNumber } from './grid-parse'
import type { CostInput } from './costs'
import type { CostItem, CostPaidFrom, Partner } from '../types/api'

export const MAX_GROUP = 60
export const MAX_ITEM = 150
export const MAX_NOTES = 1000
export const MAX_MONTHS = 600
export const DEFAULT_GROUP = 'Other'

export const PAID_BY_NONE = 'NONE'
export const PAID_BY_BUSINESS = 'BUSINESS'
const PARTNER_PREFIX = 'P:'

// monthly rate x months + one-time, in whole cents: the figure the server saves.
export function costTotal(monthlyRate: number, months: number, oneTime: number): number {
  return sumMoney([(Math.round(monthlyRate * 100) * months) / 100, oneTime])
}

// One value for the "Paid by" cell: nobody yet, Business money, or a partner.
export function paidByValue(cost: Pick<CostItem, 'paidFrom' | 'partnerId'>): string {
  if (cost.paidFrom === 'PARTNER' && cost.partnerId) return `${PARTNER_PREFIX}${cost.partnerId}`
  return cost.paidFrom === 'BUSINESS' ? PAID_BY_BUSINESS : PAID_BY_NONE
}

export function paidByChoices(partners: Pick<Partner, 'id' | 'name'>[]) {
  return [
    { value: PAID_BY_NONE, label: 'Not paid yet' },
    ...partners.map((partner) => ({ value: `${PARTNER_PREFIX}${partner.id}`, label: partner.name })),
    { value: PAID_BY_BUSINESS, label: 'Business money → Cash book' },
  ]
}

export function decodePaidBy(value: string, partners: Pick<Partner, 'id'>[]): { paidFrom: CostPaidFrom; partnerId: string | null } | null {
  if (value === PAID_BY_NONE) return { paidFrom: 'NONE', partnerId: null }
  if (value === PAID_BY_BUSINESS) return { paidFrom: 'BUSINESS', partnerId: null }
  if (value.startsWith(PARTNER_PREFIX)) {
    const id = value.slice(PARTNER_PREFIX.length)
    return partners.some((partner) => partner.id === id) ? { paidFrom: 'PARTNER', partnerId: id } : null
  }
  return null
}

export type CostPlan =
  | { kind: 'noop' }
  | { kind: 'error'; message: string }
  | { kind: 'patch'; patch: Partial<CostInput>; notice?: string }

const NOOP: CostPlan = { kind: 'noop' }
const fail = (message: string): CostPlan => ({ kind: 'error', message })
const NO_AMOUNT = 'This cost has no amount. Fill the rate and months, or the one-time amount.'

function numbers(cost: CostItem, change: Partial<Pick<CostItem, 'monthlyRate' | 'months' | 'oneTime'>>) {
  return { monthlyRate: cost.monthlyRate, months: cost.months, oneTime: cost.oneTime, ...change }
}

// Typing in a cell of an existing cost.
export function planCostEdit(cost: CostItem, columnId: string, text: string, partners: Pick<Partner, 'id'>[]): CostPlan {
  switch (columnId) {
    case 'group': {
      const group = text.trim() || DEFAULT_GROUP
      if (group.length > MAX_GROUP) return fail(`The group is too long (max ${MAX_GROUP} characters).`)
      return group === cost.groupName ? NOOP : { kind: 'patch', patch: { groupName: group } }
    }
    case 'item': {
      const item = text.trim()
      if (item === '') return fail('Type what the cost is for.')
      if (item.length > MAX_ITEM) return fail(`The item is too long (max ${MAX_ITEM} characters).`)
      return item === cost.item ? NOOP : { kind: 'patch', patch: { item } }
    }
    case 'rate':
    case 'oneTime': {
      const parsed = parseMoneyInput(text)
      if (parsed.kind === 'error') return fail(parsed.message)
      const value = parsed.kind === 'ok' ? parsed.value : 0
      const key = columnId === 'rate' ? 'monthlyRate' : 'oneTime'
      if (value === cost[key]) return NOOP
      const next = numbers(cost, { [key]: value })
      return costTotal(next.monthlyRate, next.months, next.oneTime) > 0 ? { kind: 'patch', patch: { [key]: value } } : fail(NO_AMOUNT)
    }
    case 'months': {
      const parsed = parseWholeNumber(text, MAX_MONTHS)
      if (parsed.kind === 'error') return fail(parsed.message)
      const value = parsed.kind === 'ok' ? parsed.value : 0
      if (value === cost.months) return NOOP
      const next = numbers(cost, { months: value })
      return costTotal(next.monthlyRate, next.months, next.oneTime) > 0 ? { kind: 'patch', patch: { months: value } } : fail(NO_AMOUNT)
    }
    case 'paidBy': {
      const who = decodePaidBy(text, partners)
      if (!who) return fail('Choose who paid it.')
      if (text === paidByValue(cost)) return NOOP
      const wasPosted = cost.paidFrom === 'BUSINESS'
      const notice =
        who.paidFrom === 'BUSINESS' ? 'Posted to the Cash book as money out.' : wasPosted ? 'Removed from the Cash book.' : undefined
      return { kind: 'patch', patch: { paidFrom: who.paidFrom, partnerId: who.partnerId }, notice }
    }
    case 'paidOn': {
      if (cost.paidFrom === 'NONE') return fail('Choose who paid it first.')
      if (text.trim() === '') return NOOP
      const iso = parseDateInput(text)
      if (!iso) return fail('Use a date like 12 Oct 2026.')
      if (iso === (cost.paidOn ?? '').slice(0, 10)) return NOOP
      const future = futureDateError(iso)
      return future ? fail(future) : { kind: 'patch', patch: { paidOn: iso } }
    }
    case 'notes': {
      const notes = text.trim()
      if (notes.length > MAX_NOTES) return fail(`The notes are too long (max ${MAX_NOTES} characters).`)
      return notes === (cost.notes ?? '') ? NOOP : { kind: 'patch', patch: { notes: notes === '' ? null : notes } }
    }
    default:
      return NOOP
  }
}

export interface NewCostDraft {
  group: string
  item: string
  rate: string
  months: string
  oneTime: string
  paidBy: string
  paidOn: string
  notes: string
}

export type NewCostResult = { ok: true; input: CostInput } | { ok: false; column: keyof NewCostDraft; message: string }

// The blank add-row: an item and an amount (a rate x months, or a one-time one).
export function buildNewCost(draft: NewCostDraft, partners: Pick<Partner, 'id'>[]): NewCostResult {
  const bad = (column: keyof NewCostDraft, message: string): NewCostResult => ({ ok: false, column, message })

  const item = draft.item.trim()
  if (item === '') return bad('item', 'Item: type what the cost is for.')
  if (item.length > MAX_ITEM) return bad('item', `Item: too long (max ${MAX_ITEM} characters).`)
  const group = draft.group.trim() || DEFAULT_GROUP
  if (group.length > MAX_GROUP) return bad('group', `Group: too long (max ${MAX_GROUP} characters).`)

  const rate = parseMoneyInput(draft.rate)
  if (rate.kind === 'error') return bad('rate', `Monthly rate: ${rate.message}`)
  const oneTime = parseMoneyInput(draft.oneTime)
  if (oneTime.kind === 'error') return bad('oneTime', `One-time: ${oneTime.message}`)
  const months = parseWholeNumber(draft.months, MAX_MONTHS)
  if (months.kind === 'error') return bad('months', `Months: ${months.message}`)
  const values = {
    monthlyRate: rate.kind === 'ok' ? rate.value : 0,
    months: months.kind === 'ok' ? months.value : 0,
    oneTime: oneTime.kind === 'ok' ? oneTime.value : 0,
  }
  if (costTotal(values.monthlyRate, values.months, values.oneTime) <= 0) return bad('oneTime', NO_AMOUNT)

  const who = decodePaidBy(draft.paidBy === '' ? PAID_BY_NONE : draft.paidBy, partners)
  if (!who) return bad('paidBy', 'Paid by: choose one.')

  let paidOn: string | null = null
  if (draft.paidOn.trim() !== '') {
    if (who.paidFrom === 'NONE') return bad('paidOn', 'Paid on: choose who paid it first.')
    const iso = parseDateInput(draft.paidOn)
    if (!iso) return bad('paidOn', 'Paid on: use a date like 12 Oct 2026.')
    const future = futureDateError(iso)
    if (future) return bad('paidOn', future)
    paidOn = iso
  }
  const notes = draft.notes.trim()
  if (notes.length > MAX_NOTES) return bad('notes', `Notes: too long (max ${MAX_NOTES} characters).`)

  return {
    ok: true,
    input: {
      groupName: group,
      item,
      ...values,
      paidFrom: who.paidFrom,
      partnerId: who.partnerId,
      paidOn,
      notes: notes === '' ? null : notes,
    },
  }
}
