// Paste / import rules for the Cash book: one row of cells becomes one entry,
// or a plain-words reason why not. The server checks every row again.
import { buildNewEntry } from './cashbook-grid'
import { parseDateInput } from './grid-parse'
import { sumMoney } from './grid-rows'
import { countKeys, type ImportTarget, type RowCheck } from './paste-import'
import type { Category, CategoryType, Transaction } from '../types/api'
import type { BulkTransactionRow } from './transactions'

export const CASHBOOK_TARGETS: ImportTarget[] = [
  { id: 'date', label: 'Date', synonyms: ['day', 'when'] },
  { id: 'desc', label: 'Description', synonyms: ['what for', 'details', 'particulars', 'memo', 'narration', 'note', 'notes'] },
  { id: 'cat', label: 'Category', synonyms: ['type', 'head'] },
  { id: 'inn', label: 'Money in', synonyms: ['in', 'income', 'credit', 'received', 'deposit', 'cr'] },
  { id: 'out', label: 'Money out', synonyms: ['out', 'expense', 'debit', 'paid', 'spent', 'dr'] },
  { id: 'proof', label: 'Proof link', synonyms: ['proof', 'link', 'receipt', 'url'] },
]

// The group a category made by an import goes under, so it is easy to find and tidy.
export const IMPORTED_GROUP = 'Imported'

export interface CashbookImportRow {
  entry: BulkTransactionRow
  date: string
  amount: number
  type: CategoryType
  memo: string
  // A category that has to be made first (name + kind), when the row's one does not exist yet.
  newCategory: { name: string; type: CategoryType } | null
}

const lower = (text: string) => text.trim().toLowerCase()

// Same date + description + amount = the same entry (the rule of the import screen).
export function cashbookKey(date: string, memo: string, amount: number): string {
  return `${date}|${lower(memo)}|${amount.toFixed(2)}`
}

export function existingCashbookKeys(transactions: Transaction[]): Map<string, number> {
  return countKeys(transactions.map((tx) => cashbookKey(tx.date.slice(0, 10), tx.memo ?? '', tx.amount)))
}

export interface CashbookCheckOptions {
  createCategories: boolean
}

// Checks every row of a paste / import. A category made by the import keeps
// one kind: the first row that uses it decides, a later row of the other kind
// is refused (the same name cannot be both money in and money out).
export function checkCashbookRows(
  list: Record<string, string>[],
  categories: Category[],
  options: CashbookCheckOptions,
): { check: RowCheck<CashbookImportRow>; key: string | null }[] {
  const byName = new Map(categories.map((category) => [lower(category.name), category]))
  const planned = new Map<string, { name: string; type: CategoryType }>()

  return list.map((values) => {
    const date = parseDateInput(values.date ?? '')
    const inText = (values.inn ?? '').trim()
    const outText = (values.out ?? '').trim()
    const side: CategoryType | null = inText !== '' && outText === '' ? 'INCOME' : outText !== '' && inText === '' ? 'EXPENSE' : null
    const name = (values.cat ?? '').trim()
    const fail = (message: string) => ({ check: { status: 'error', message } as RowCheck<CashbookImportRow>, key: null })

    if (!date) return fail('Date: use a date like 12 May 2026.')
    if (inText !== '' && outText !== '') return fail('Fill only one of Money in or Money out.')
    if (side === null) return fail('Amount: fill Money in or Money out.')
    if (name === '') return fail('Category: choose one.')

    let category = byName.get(lower(name))
    let newCategory: CashbookImportRow['newCategory'] = null
    if (category?.isSystem) return fail(`“${category.name}” is posted automatically. Pick another category.`)
    if (!category) {
      if (!options.createCategories) return fail(`Category “${name}” doesn't exist.`)
      const known = planned.get(lower(name))
      if (known && known.type !== side) return fail(`“${name}” can't be both money in and money out.`)
      newCategory = known ?? { name, type: side }
      planned.set(lower(name), newCategory)
      // Check the rest of the row against a stand-in with the right kind.
      category = { id: '', businessId: '', name, type: side, groupName: IMPORTED_GROUP, isSystem: false, createdAt: '' }
    }

    const built = buildNewEntry(
      { date: values.date ?? '', memo: values.desc ?? '', categoryId: category.id || 'new', moneyIn: inText, moneyOut: outText, proofUrl: values.proof ?? '' },
      [{ ...category, id: category.id || 'new' }],
    )
    if (!built.ok) return fail(built.message)
    const amount = built.input.amount as number
    const memo = (values.desc ?? '').trim()
    const entry: BulkTransactionRow = { ...built.input, categoryId: newCategory ? undefined : category.id }
    return {
      check: { status: 'ok', row: { entry, date, amount, type: side, memo, newCategory } },
      key: cashbookKey(date, memo, amount),
    }
  })
}

export function summarizeCashbookRows(rows: CashbookImportRow[]): { moneyIn: number; moneyOut: number } {
  return {
    moneyIn: sumMoney(rows.filter((row) => row.type === 'INCOME').map((row) => row.amount)),
    moneyOut: sumMoney(rows.filter((row) => row.type === 'EXPENSE').map((row) => row.amount)),
  }
}

// The categories to make before the entries can be saved, one per name.
export function categoriesToCreate(rows: CashbookImportRow[]): { name: string; type: CategoryType }[] {
  const seen = new Map<string, { name: string; type: CategoryType }>()
  for (const row of rows) {
    if (row.newCategory && !seen.has(lower(row.newCategory.name))) seen.set(lower(row.newCategory.name), row.newCategory)
  }
  return [...seen.values()]
}
