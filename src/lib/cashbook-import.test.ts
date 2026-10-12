import { describe, expect, it } from 'vitest'
import {
  CASHBOOK_TARGETS,
  IMPORTED_GROUP,
  cashbookKey,
  categoriesToCreate,
  checkCashbookRows,
  existingCashbookKeys,
  summarizeCashbookRows,
  type CashbookImportRow,
} from './cashbook-import'
import { markDuplicates, parseDelimited, prepareRows, rowValues } from './paste-import'
import type { Category, Transaction } from '../types/api'

const cat = (id: string, name: string, type: Category['type'], isSystem = false): Category => ({ id, businessId: 'b', name, type, groupName: null, isSystem, createdAt: '' })
const CATEGORIES = [
  cat('c1', 'Client money received', 'INCOME'),
  cat('c2', 'Product purchase', 'EXPENSE'),
  cat('c3', 'Transport', 'EXPENSE'),
  cat('c4', 'Orders (auto)', 'INCOME', true),
]

function check(rows: Record<string, string>[], createCategories = false) {
  return checkCashbookRows(rows, CATEGORIES, { createCategories })
}

describe('checkCashbookRows', () => {
  it('turns a good row into an entry', () => {
    const [result] = check([{ date: '14 May 2026', desc: 'Payment for new product', cat: 'client money received', inn: '8,000', proof: 'https://x.test/p' }])
    expect(result.check).toMatchObject({
      status: 'ok',
      row: { date: '2026-05-14', amount: 8000, type: 'INCOME', entry: { categoryId: 'c1', type: 'INCOME', amount: 8000, memo: 'Payment for new product', proofUrl: 'https://x.test/p' } },
    })
    expect(result.key).toBe('2026-05-14|payment for new product|8000.00')
  })

  it('reads money out', () => {
    const [result] = check([{ date: '2026-05-14', desc: 'Transportation', cat: 'Transport', out: '180' }])
    expect(result.check).toMatchObject({ status: 'ok', row: { type: 'EXPENSE', amount: 180 } })
  })

  it.each([
    [{ date: 'soon', cat: 'Transport', out: '5' }, 'Date: use a date like 12 May 2026.'],
    [{ date: '31 Feb 2026', cat: 'Transport', out: '5' }, 'Date: use a date like 12 May 2026.'],
    [{ date: '1 Jan 2099', cat: 'Transport', out: '5' }, "Entries can't be dated in the future."],
    [{ date: '1 May 2026', cat: 'Transport', inn: '5', out: '5' }, 'Fill only one of Money in or Money out.'],
    [{ date: '1 May 2026', cat: 'Transport' }, 'Amount: fill Money in or Money out.'],
    [{ date: '1 May 2026', out: '5' }, 'Category: choose one.'],
    [{ date: '1 May 2026', cat: 'Domain & hosting', out: '1,400' }, 'Category “Domain & hosting” doesn\'t exist.'],
    [{ date: '1 May 2026', cat: 'Transport', inn: '5' }, 'That category is for money out.'],
    [{ date: '1 May 2026', cat: 'Client money received', out: '5' }, 'That category is for money in.'],
    [{ date: '1 May 2026', cat: 'Transport', out: 'abc' }, 'Type a number, like 1,250.'],
    [{ date: '1 May 2026', cat: 'Transport', out: '0' }, 'The amount must be more than 0.'],
    [{ date: '1 May 2026', cat: 'Transport', out: '5', proof: 'http://x.test' }, 'The link must start with https://'],
  ])('refuses %j with a plain message', (row, message) => {
    expect(check([row])[0].check).toEqual({ status: 'error', message })
  })

  it('will not file an entry under a system category', () => {
    expect(check([{ date: '1 May 2026', cat: 'Orders (auto)', inn: '5' }])[0].check).toMatchObject({
      status: 'error',
      message: '“Orders (auto)” is posted automatically. Pick another category.',
    })
  })

  describe('create categories that do not exist yet', () => {
    it('plans a new category of the kind of money the row is', () => {
      const [result] = check([{ date: '1 May 2026', cat: 'Domain & hosting', out: '1,400' }], true)
      expect(result.check).toMatchObject({ status: 'ok', row: { newCategory: { name: 'Domain & hosting', type: 'EXPENSE' }, entry: { categoryId: undefined } } })
    })

    it('uses an existing category as it is, whatever its case', () => {
      const [result] = check([{ date: '1 May 2026', cat: 'TRANSPORT', out: '5' }], true)
      expect(result.check).toMatchObject({ status: 'ok', row: { newCategory: null, entry: { categoryId: 'c3' } } })
    })

    it('refuses the same new name as both money in and money out', () => {
      const result = check(
        [
          { date: '1 May 2026', cat: 'Misc', out: '5' },
          { date: '2 May 2026', cat: 'misc', inn: '5' },
        ],
        true,
      )
      expect(result[0].check.status).toBe('ok')
      expect(result[1].check).toEqual({ status: 'error', message: '“misc” can\'t be both money in and money out.' })
    })

    it('makes each new category once', () => {
      const rows = check(
        [
          { date: '1 May 2026', cat: 'Misc', out: '5' },
          { date: '2 May 2026', cat: 'MISC', out: '7' },
          { date: '3 May 2026', cat: 'Other', out: '1' },
        ],
        true,
      ).map((r) => (r.check.status === 'ok' ? r.check.row : null)) as CashbookImportRow[]
      expect(categoriesToCreate(rows).map((c) => c.name)).toEqual(['Misc', 'Other'])
    })

    it('still refuses a row that is wrong in another way', () => {
      expect(check([{ date: 'soon', cat: 'Misc', out: '5' }], true)[0].check.status).toBe('error')
    })
  })
})

describe('duplicates', () => {
  const tx = (date: string, memo: string, amount: number): Transaction =>
    ({ id: date + memo, date: `${date}T00:00:00.000Z`, memo, amount, type: 'INCOME' }) as Transaction

  it('same date + description + amount is "already there"', () => {
    const existing = existingCashbookKeys([tx('2026-05-11', 'Initial payment', 5000)])
    const checked = check([
      { date: '11 May 2026', desc: 'initial PAYMENT', cat: 'Client money received', inn: '5,000' },
      { date: '11 May 2026', desc: 'Initial payment', cat: 'Client money received', inn: '5,001' },
    ])
    expect(markDuplicates(checked, existing).map((r) => r.status)).toEqual(['duplicate', 'ok'])
  })

  it('builds the key from the cents', () => {
    expect(cashbookKey('2026-05-11', ' Hello ', 5)).toBe('2026-05-11|hello|5.00')
  })
})

describe('summarizeCashbookRows', () => {
  it('adds money in and money out of the ready rows in whole cents', () => {
    const rows = check([
      { date: '1 May 2026', cat: 'Client money received', inn: '0.1' },
      { date: '1 May 2026', cat: 'Client money received', inn: '0.2' },
      { date: '1 May 2026', cat: 'Transport', out: '250' },
    ]).map((r) => (r.check.status === 'ok' ? r.check.row : null)) as CashbookImportRow[]
    expect(summarizeCashbookRows(rows)).toEqual({ moneyIn: 0.3, moneyOut: 250 })
  })
})

describe('a pasted block, start to end', () => {
  const block = [
    'Date\tWhat for\tType\tIn\tOut\tLink',
    '14 May 2026\tPayment for new product\tClient money received\t8,000\t\t',
    '14 May 2026\tBought the product · 3rd order\tProduct purchase\t\t5,250\t',
    '15 May 2026\tTransportation\tTransport\t\t180\t',
  ].join('\n')

  it('matches the header by name and checks every row', () => {
    const prepared = prepareRows(parseDelimited(block), CASHBOOK_TARGETS)
    expect(prepared.mapping).toEqual(['date', 'desc', 'cat', 'inn', 'out', 'proof'])
    const checked = check(prepared.rows.map((cells) => rowValues(cells, prepared.mapping)))
    expect(checked.map((c) => c.check.status)).toEqual(['ok', 'ok', 'ok'])
    const ready = checked.map((c) => (c.check.status === 'ok' ? c.check.row : null)) as CashbookImportRow[]
    expect(summarizeCashbookRows(ready)).toEqual({ moneyIn: 8000, moneyOut: 5430 })
  })

  it('imported categories land in the Imported group', () => {
    expect(IMPORTED_GROUP).toBe('Imported')
  })
})
