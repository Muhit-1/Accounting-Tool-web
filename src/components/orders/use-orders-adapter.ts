import { useMemo } from 'react'
import { formatMoneyCell } from '../../lib/grid-parse'
import { ORDER_TARGETS, checkOrderRows, existingOrderKeys, orderCashbookTotals, summarizeOrderRows, type OrderImportRow } from '../../lib/orders-import'
import { useBulkCreateOrders, useUndoOrderBatch } from '../../lib/orders'
import type { ImportAdapter } from '../../lib/paste-import'
import type { Order } from '../../types/api'

// How Orders reads pasted and imported rows, and saves them: one all-or-nothing
// request; the server numbers the orders and posts the delivered ones.
export function useOrdersAdapter(businessId: string, accountId: string, orders: Order[]): ImportAdapter<OrderImportRow> {
  const bulk = useBulkCreateOrders(businessId)
  const undo = useUndoOrderBatch(businessId)
  const bulkAsync = bulk.mutateAsync
  const undoAsync = undo.mutateAsync

  return useMemo<ImportAdapter<OrderImportRow>>(
    () => ({
      noun: 'orders',
      singular: 'order',
      title: 'Orders',
      targets: ORDER_TARGETS,
      existing: existingOrderKeys(orders),
      check: (list) => checkOrderRows(list),
      summarize: (rows) => {
        const posted = orderCashbookTotals(rows)
        const money = [
          posted.moneyIn ? `${formatMoneyCell(posted.moneyIn)} money in` : '',
          posted.moneyOut ? `${formatMoneyCell(posted.moneyOut)} money out` : '',
        ].filter(Boolean)
        return `${summarizeOrderRows(rows)}${money.length ? ` — ${money.join(', ')}` : ''}`
      },
      commit: async (rows) => {
        const result = await bulkAsync({ accountId, rows: rows.map((row) => row.order) })
        return { batchId: result.importBatchId, created: result.created }
      },
      undo: (batchId) => undoAsync(batchId),
    }),
    [orders, accountId, bulkAsync, undoAsync],
  )
}
