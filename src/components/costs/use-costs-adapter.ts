import { useMemo } from 'react'
import { COST_TARGETS, checkCostRows, costCashbookTotals, costTotals, existingCostKeys, partnersToCreate, type CostImportRow } from '../../lib/costs-import'
import { useBulkCreateCosts, useUndoCostBatch } from '../../lib/costs'
import { formatMoneyCell } from '../../lib/grid-parse'
import { useCreatePartner, useDeletePartner } from '../../lib/partners'
import type { ImportAdapter } from '../../lib/paste-import'
import type { CostItem, Partner } from '../../types/api'

// How Costs reads pasted and imported rows, and saves them: partners the rows
// name are made first (when asked for), then all costs in one all-or-nothing
// request; the ones paid from Business money post to the Cash book there.
export function useCostsAdapter(businessId: string, costs: CostItem[], partners: Partner[]): ImportAdapter<CostImportRow> {
  const bulk = useBulkCreateCosts(businessId)
  const undo = useUndoCostBatch(businessId)
  const createPartner = useCreatePartner(businessId)
  const deletePartner = useDeletePartner(businessId)
  const bulkAsync = bulk.mutateAsync
  const undoAsync = undo.mutateAsync
  const createPartnerAsync = createPartner.mutateAsync
  const deletePartnerAsync = deletePartner.mutateAsync

  return useMemo<ImportAdapter<CostImportRow>>(
    () => ({
      noun: 'costs',
      singular: 'cost',
      title: 'Costs',
      targets: COST_TARGETS,
      offersNewCategories: true,
      newItemsNoun: 'partners',
      existing: existingCostKeys(costs),
      check: (list, options) => checkCostRows(list, partners, options),
      summarize: (rows) => {
        const totals = costTotals(rows)
        const posted = costCashbookTotals(rows).moneyOut
        return `${formatMoneyCell(totals.total)} total · ${formatMoneyCell(totals.paid)} paid · ${formatMoneyCell(totals.due)} due${posted ? ` — ${formatMoneyCell(posted)} posted to the Cash book` : ''}`
      },
      commit: async (rows) => {
        const made = new Map<string, string>()
        try {
          for (const name of partnersToCreate(rows)) {
            const created = await createPartnerAsync(name)
            made.set(name.trim().toLowerCase(), created.id)
          }
          const inputs = rows.map((row) =>
            row.newPartner ? { ...row.cost, partnerId: made.get(row.newPartner.trim().toLowerCase()) ?? null } : row.cost,
          )
          const result = await bulkAsync({ rows: inputs })
          return { batchId: result.importBatchId, created: result.created }
        } catch (err) {
          // Nothing was added, so the partners made for it go again (best effort).
          await Promise.allSettled([...made.values()].map((id) => deletePartnerAsync(id)))
          throw err
        }
      },
      undo: (batchId) => undoAsync(batchId),
    }),
    [costs, partners, createPartnerAsync, deletePartnerAsync, bulkAsync, undoAsync],
  )
}
