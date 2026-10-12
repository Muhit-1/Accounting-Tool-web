// The rules of the Cash book grid, apart from the screen: what an edited or
// added row turns into, and what is refused first. The server checks all of
// it again (and recomputes every calculated amount) — this only gives the
// plain-words message in the cell instead of a round trip.
import { describeCalculation, type AmountType } from './calc'
import { futureDateError, parseDateInput, parseMoneyInput } from './grid-parse'
import { proofUrlError } from './proof-url'
import { groupCategories } from './category-groups'
import type { Category, CategoryType, Transaction } from '../types/api'
import type { TransactionInput } from './transactions'

export function moneyInOf(tx: Transaction): number | null {
  return tx.type === 'INCOME' ? tx.amount : null
}

export function moneyOutOf(tx: Transaction): number | null {
  return tx.type === 'EXPENSE' ? tx.amount : null
}

// A row with a calculation keeps its amount locked until the calculation is cleared.
export function isCalculated(tx: Pick<Transaction, 'amountType' | 'amountInputs'>): boolean {
  return Boolean(tx.amountType && tx.amountType !== 'FIXED' && tx.amountInputs)
}

// "1,000 × 5", shown as a chip in the amount cell.
export function calculationChip(tx: Pick<Transaction, 'amountType' | 'amountInputs'>): string | null {
  return isCalculated(tx) ? describeCalculation(tx.amountType as AmountType, tx.amountInputs as number[]) : null
}

// Where an entry came from when another table posted it (gold, locked row).
export function postedBy(tx: Pick<Transaction, 'orderId'>): { kind: 'order'; label: string } | null {
  return tx.orderId ? { kind: 'order', label: 'Orders' } : null
}

export interface CategoryChoice {
  value: string
  label: string
  group: string | null
  type: CategoryType
}

// The Category cell's list: grouped, system categories left out (they are
// "Posted automatically"), except the one the row already has.
export function categoryChoices(categories: Category[], currentId?: string | null): CategoryChoice[] {
  const usable = categories.filter((category) => !category.isSystem || category.id === currentId)
  return groupCategories(usable).flatMap((group) =>
    group.items.map((category) => ({
      value: category.id,
      label: category.name,
      group: group.label,
      type: category.type,
    })),
  )
}

const KIND_WORD: Record<CategoryType, string> = { INCOME: 'in', EXPENSE: 'out' }

export function categoryTypeError(category: Pick<Category, 'type'>, entryType: CategoryType): string | null {
  return category.type === entryType ? null : `That category is for money ${KIND_WORD[category.type]}.`
}

// The balance before the first row shown, for the "Balance brought forward"
// line. Only meaningful when the view is in date order and starts after the
// first entry ever made (a search or filter, not an empty book). Cents maths.
export function broughtForward(all: Transaction[], visible: Transaction[]): number | null {
  const first = visible[0]
  if (!first || first.runningBalance === undefined || all.length === 0 || all[0].id === first.id) return null
  const signed = Math.round(first.amount * 100) * (first.type === 'INCOME' ? 1 : -1)
  return (Math.round(first.runningBalance * 100) - signed) / 100
}

export function closingBalance(all: Transaction[]): number {
  return all.length === 0 ? 0 : (all[all.length - 1].runningBalance ?? 0)
}

export type Plan = { kind: 'noop' } | { kind: 'error'; message: string } | { kind: 'patch'; patch: Partial<TransactionInput>; notice?: string }

const NOOP: Plan = { kind: 'noop' }
const fail = (message: string): Plan => ({ kind: 'error', message })

// Typing in Money in / Money out of an existing entry.
//  - same column as now: the amount changes;
//  - the other column: the entry moves there (its category is dropped by the
//    server when it no longer fits, so the notice asks for a new one);
//  - emptying the only amount: refused (every entry has an amount).
export function planMoneyEdit(tx: Transaction, side: 'in' | 'out', text: string): Plan {
  if (isCalculated(tx)) return fail('This amount is calculated. Click ƒ and clear the calculation first.')
  const parsed = parseMoneyInput(text)
  if (parsed.kind === 'error') return fail(parsed.message)
  const currentSide = tx.type === 'INCOME' ? 'in' : 'out'
  if (parsed.kind === 'empty') {
    return side === currentSide ? fail('An entry needs an amount. Type it in the other column to move it.') : NOOP
  }
  if (!(parsed.value > 0)) return fail('The amount must be more than 0.')
  if (side === currentSide) return parsed.value === tx.amount ? NOOP : { kind: 'patch', patch: { amount: parsed.value } }
  const type: CategoryType = side === 'in' ? 'INCOME' : 'EXPENSE'
  const keepsCategory = tx.category && tx.category.type === type
  return {
    kind: 'patch',
    patch: { type, amount: parsed.value },
    notice: keepsCategory ? undefined : `Moved to money ${side}. Pick a category for it.`,
  }
}

export function planCategoryEdit(tx: Transaction, categoryId: string, categories: Category[]): Plan {
  if (categoryId === '') return tx.category ? { kind: 'patch', patch: { categoryId: null } } : NOOP
  const category = categories.find((candidate) => candidate.id === categoryId)
  if (!category) return fail('That category does not exist any more.')
  if (tx.category?.id === categoryId) return NOOP
  if (tx.type) {
    const problem = categoryTypeError(category, tx.type)
    if (problem) return fail(problem)
  }
  return { kind: 'patch', patch: { categoryId } }
}

export function planDateEdit(tx: Transaction, text: string): Plan {
  const iso = parseDateInput(text)
  if (!iso) return fail('Use a date like 12 May 2026.')
  if (iso === tx.date.slice(0, 10)) return NOOP
  const future = futureDateError(iso)
  return future ? fail(future) : { kind: 'patch', patch: { date: iso } }
}

export const MAX_MEMO = 1000

export function planMemoEdit(tx: Transaction, text: string): Plan {
  const memo = text.trim()
  if (memo.length > MAX_MEMO) return fail(`The description is too long (max ${MAX_MEMO} characters).`)
  return memo === (tx.memo ?? '') ? NOOP : { kind: 'patch', patch: { memo } }
}

export function planProofEdit(tx: Transaction, text: string): Plan {
  const problem = proofUrlError(text)
  if (problem) return fail(problem)
  const proofUrl = text.trim() || null
  return proofUrl === (tx.proofUrl ?? null) ? NOOP : { kind: 'patch', patch: { proofUrl } }
}

export interface NewEntryDraft {
  date: string
  memo: string
  categoryId: string
  moneyIn: string
  moneyOut: string
  proofUrl: string
  // Set when the amount came from the ƒ popover instead of the box.
  calc?: { type: AmountType; inputs: number[]; amount: number } | null
}

export type NewEntryResult =
  | { ok: true; input: Omit<TransactionInput, 'accountId'> }
  | { ok: false; message: string; column: 'date' | 'category' | 'moneyIn' | 'moneyOut' | 'proof' }

// The blank add-row: date (defaults to today), a category that matches the
// kind of money, and exactly one of Money in / Money out.
export function buildNewEntry(draft: NewEntryDraft, categories: Category[]): NewEntryResult {
  const date = parseDateInput(draft.date)
  if (!date) return { ok: false, column: 'date', message: 'Date: use a date like 12 May 2026.' }
  const future = futureDateError(date)
  if (future) return { ok: false, column: 'date', message: future }

  if (!draft.categoryId) return { ok: false, column: 'category', message: 'Category: choose one.' }
  const category = categories.find((candidate) => candidate.id === draft.categoryId)
  if (!category) return { ok: false, column: 'category', message: 'Category: choose one.' }

  const inText = draft.moneyIn.trim()
  const outText = draft.moneyOut.trim()
  if (inText !== '' && outText !== '') {
    return { ok: false, column: 'moneyOut', message: 'Fill only one of Money in or Money out.' }
  }
  if (inText === '' && outText === '') {
    return { ok: false, column: 'moneyIn', message: 'Amount: fill Money in or Money out.' }
  }
  const side = inText !== '' ? 'in' : 'out'
  const column = side === 'in' ? 'moneyIn' : 'moneyOut'
  const type: CategoryType = side === 'in' ? 'INCOME' : 'EXPENSE'

  const mismatch = categoryTypeError(category, type)
  if (mismatch) return { ok: false, column: 'category', message: mismatch }

  const proofProblem = proofUrlError(draft.proofUrl)
  if (proofProblem) return { ok: false, column: 'proof', message: proofProblem }

  const input: Omit<TransactionInput, 'accountId'> = {
    date,
    type,
    categoryId: category.id,
    memo: draft.memo.trim() || undefined,
    proofUrl: draft.proofUrl.trim() || undefined,
  }

  if (draft.calc) {
    // The server works the amount out again from the same boxes.
    input.amountType = draft.calc.type
    input.amountInputs = draft.calc.inputs
    input.amount = draft.calc.amount
    return { ok: true, input }
  }

  const parsed = parseMoneyInput(side === 'in' ? inText : outText)
  if (parsed.kind === 'error') return { ok: false, column, message: parsed.message }
  if (parsed.kind === 'empty' || !(parsed.value > 0)) {
    return { ok: false, column, message: 'The amount must be more than 0.' }
  }
  input.amount = parsed.value
  return { ok: true, input }
}
