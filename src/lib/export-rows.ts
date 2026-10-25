// What the Cash book writes to an exported file from Settings → Data:
// all its rows and every column, values only (numbers stay numbers).
import { formatDateCell } from './grid-parse'
import type { ExportCell } from './export-table'
import type { Transaction } from '../types/api'

export interface ExportSheet {
  name: string
  headers: string[]
  rows: ExportCell[][]
}

export function cashbookExport(name: string, transactions: Transaction[]): ExportSheet {
  return {
    name,
    headers: ['Date', 'Description', 'Category', 'Money in', 'Money out', 'Balance', 'Proof link'],
    rows: transactions.map((tx) => [
      formatDateCell(tx.date),
      tx.memo ?? '',
      tx.category?.name ?? '',
      tx.type === 'INCOME' ? tx.amount : null,
      tx.type === 'EXPENSE' ? tx.amount : null,
      tx.runningBalance ?? null,
      tx.proofUrl ?? '',
    ]),
  }
}
