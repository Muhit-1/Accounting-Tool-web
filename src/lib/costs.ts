import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import { invalidateTransactionQueries } from './transactions'
import type { CostItem, CostList, CostPaidFrom } from '../types/api'

export interface CostInput {
  groupName?: string
  item: string
  monthlyRate?: number
  months?: number
  oneTime?: number
  paidFrom?: CostPaidFrom
  partnerId?: string | null
  paidOn?: string | null
  startMonth?: string | null
  notes?: string | null
}

export function useCosts(businessId: string | undefined) {
  return useQuery({
    queryKey: ['costs', businessId],
    queryFn: () => api.get<CostList>(`/businesses/${businessId}/costs`),
    enabled: Boolean(businessId),
  })
}

// A cost paid from Business money owns a Cash book entry, so every cost change
// can move the balance, the statement, the monthly view and the partner report.
function useAfterCostChange(businessId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['costs', businessId] })
    queryClient.invalidateQueries({ queryKey: ['categories', businessId] })
    queryClient.invalidateQueries({ queryKey: ['partners', businessId] })
    queryClient.invalidateQueries({ queryKey: ['partner-payments', businessId] })
    invalidateTransactionQueries(queryClient, businessId)
  }
}

export function useCreateCost(businessId: string) {
  const afterChange = useAfterCostChange(businessId)
  return useMutation({
    mutationFn: (input: CostInput) => api.post<CostItem>(`/businesses/${businessId}/costs`, input),
    onSuccess: afterChange,
  })
}

export function useUpdateCost(businessId: string) {
  const afterChange = useAfterCostChange(businessId)
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CostInput> & { id: string }) => api.patch<CostItem>(`/businesses/${businessId}/costs/${id}`, input),
    onSuccess: afterChange,
  })
}

export function useDeleteCost(businessId: string) {
  const afterChange = useAfterCostChange(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/costs/${id}`),
    onSuccess: afterChange,
  })
}

export interface BulkCostsResult {
  importBatchId: string
  created: number
  // How many were paid from Business money and posted, and the money they moved out.
  posted: number
  totalOut: number
}

export function useBulkCreateCosts(businessId: string) {
  const afterChange = useAfterCostChange(businessId)
  return useMutation({
    mutationFn: (input: { rows: CostInput[]; importBatchId?: string }) => api.post<BulkCostsResult>(`/businesses/${businessId}/costs/bulk`, input),
    onSuccess: afterChange,
  })
}

export function useUndoCostBatch(businessId: string) {
  const afterChange = useAfterCostChange(businessId)
  return useMutation({
    mutationFn: (importBatchId: string) => api.delete<{ deleted: number }>(`/businesses/${businessId}/costs/batch/${importBatchId}`),
    onSuccess: afterChange,
  })
}
