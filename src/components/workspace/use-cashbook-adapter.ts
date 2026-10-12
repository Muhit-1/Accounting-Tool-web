import { useMemo } from 'react'
import {
  CASHBOOK_TARGETS,
  IMPORTED_GROUP,
  categoriesToCreate,
  checkCashbookRows,
  existingCashbookKeys,
  summarizeCashbookRows,
  type CashbookImportRow,
} from '../../lib/cashbook-import'
import { useCreateCategory, useDeleteCategory } from '../../lib/categories'
import { formatMoneyCell } from '../../lib/grid-parse'
import type { ImportAdapter } from '../../lib/paste-import'
import { useBulkCreateTransactions, useUndoTransactionBatch } from '../../lib/transactions'
import type { Category, Transaction } from '../../types/api'

// How the Cash book reads pasted and imported rows, and saves them: new
// categories first (when asked for), then all entries in one all-or-nothing request.
export function useCashbookAdapter(
  businessId: string,
  accountId: string,
  categories: Category[],
  transactions: Transaction[],
): ImportAdapter<CashbookImportRow> {
  const createCategory = useCreateCategory(businessId)
  const deleteCategory = useDeleteCategory(businessId)
  const bulk = useBulkCreateTransactions(businessId, accountId)
  const undo = useUndoTransactionBatch(businessId, accountId)
  const createCategoryAsync = createCategory.mutateAsync
  const deleteCategoryAsync = deleteCategory.mutateAsync
  const bulkAsync = bulk.mutateAsync
  const undoAsync = undo.mutateAsync

  return useMemo<ImportAdapter<CashbookImportRow>>(
    () => ({
      noun: 'entries',
      singular: 'entry',
      title: 'Cash book',
      targets: CASHBOOK_TARGETS,
      offersNewCategories: true,
      existing: existingCashbookKeys(transactions),
      check: (list, options) => checkCashbookRows(list, categories, options),
      summarize: (rows) => {
        const { moneyIn, moneyOut } = summarizeCashbookRows(rows)
        return `${formatMoneyCell(moneyIn)} money in, ${formatMoneyCell(moneyOut)} money out`
      },
      commit: async (rows) => {
        const made = new Map<string, string>()
        try {
          for (const wanted of categoriesToCreate(rows)) {
            const created = await createCategoryAsync({ name: wanted.name, type: wanted.type, groupName: IMPORTED_GROUP })
            made.set(wanted.name.trim().toLowerCase(), created.id)
          }
          const entries = rows.map((row) =>
            row.newCategory ? { ...row.entry, categoryId: made.get(row.newCategory.name.trim().toLowerCase()) } : row.entry,
          )
          const result = await bulkAsync({ rows: entries })
          return { batchId: result.importBatchId, created: result.created }
        } catch (err) {
          // Nothing was added, so the categories made for it go again (best effort).
          await Promise.allSettled([...made.values()].map((id) => deleteCategoryAsync(id)))
          throw err
        }
      },
      undo: (batchId) => undoAsync(batchId),
    }),
    [categories, transactions, createCategoryAsync, deleteCategoryAsync, bulkAsync, undoAsync],
  )
}
