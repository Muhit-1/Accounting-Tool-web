import { describe, expect, it } from 'vitest'
import { cashbookExport } from './export-rows'
import { toCsv } from './export-table'
import type { Transaction } from '../types/api'

describe('cashbookExport', () => {
  it('one column of money in, one of money out, numbers kept as numbers', () => {
    const sheet = cashbookExport('Cash book', [
      { date: '2026-05-11T00:00:00.000Z', memo: '=1+1', category: { name: 'Sales' }, type: 'INCOME', amount: 5000, runningBalance: 5000, proofUrl: null },
      { date: '2026-05-12T00:00:00.000Z', memo: null, category: null, type: 'EXPENSE', amount: 4214.5, runningBalance: 785.5, proofUrl: 'https://x.test/p' },
    ] as Transaction[])
    expect(sheet.rows).toEqual([
      ['11 May 2026', '=1+1', 'Sales', 5000, null, 5000, ''],
      ['12 May 2026', '', '', null, 4214.5, 785.5, 'https://x.test/p'],
    ])
    // text that looks like a formula is made harmless when written
    expect(toCsv(sheet.headers, sheet.rows)).toContain("'=1+1")
  })
})
