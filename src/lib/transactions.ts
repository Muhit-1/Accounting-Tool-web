import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { CategoryType, Transaction } from '../types/api'
import type { AmountType } from './calc'

export function useTransactions(businessId: string | undefined, accountId?: string) {
  return useQuery({
    queryKey: ['transactions', businessId, accountId],
    queryFn: () =>
      api.get<Transaction[]>(
        `/businesses/${businessId}/transactions${accountId ? `?accountId=${accountId}` : ''}`,
      ),
    enabled: Boolean(businessId),
  })
}

export interface TransactionInput {
  accountId: string
  date: string
  memo?: string
  counterparty?: string
  // null clears the category on an edit.
  categoryId?: string | null
  // Needed for a fixed amount; for the calculated types the server works the
  // amount out from amountInputs and ignores this.
  amount?: number
  type: CategoryType
  // Leave out for a plain fixed entry. Send 'FIXED' when editing a calculated
  // entry back to a typed-in amount (the server then drops the old boxes).
  amountType?: AmountType
  amountInputs?: number[]
  // null clears the link on an edit.
  proofUrl?: string | null
}

export function invalidateTransactionQueries(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
  queryClient.invalidateQueries({ queryKey: ['statement', businessId] })
  queryClient.invalidateQueries({ queryKey: ['monthly', businessId] })
  queryClient.invalidateQueries({ queryKey: ['accounts', businessId] })
  queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
  queryClient.invalidateQueries({ queryKey: ['dashboard', 'combined'] })
}

export function useCreateTransaction(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: TransactionInput) => api.post<Transaction>(`/businesses/${businessId}/transactions`, input),
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}

export function useUpdateTransaction(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<TransactionInput> & { id: string }) =>
      api.patch<Transaction>(`/businesses/${businessId}/transactions/${id}`, input),
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}

export function useDeleteTransaction(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/transactions/${id}`),
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}

// Attaches the invoice/receipt file the user uploaded (via "Upload
// invoice") to an already-created entry — a follow-up request rather than
// part of useCreateTransaction, so the main create call stays plain JSON.
export function useUploadReceipt(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ transactionId, file }: { transactionId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.postForm<Transaction>(`/businesses/${businessId}/transactions/${transactionId}/receipt`, formData)
    },
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}

// Opens the uploaded invoice/receipt for a transaction in a new tab. Opens
// the tab synchronously (before the fetch) so browsers don't treat it as a
// blocked popup; falls back to a normal download if that's blocked anyway.
export async function openReceipt(businessId: string, transactionId: string, filename: string) {
  const newTab = window.open('', '_blank')
  // The tab only ever shows our own blob; there's no reason for it to keep a
  // handle back to this app's window.
  if (newTab) newTab.opener = null
  try {
    const blob = await api.getBlob(`/businesses/${businessId}/transactions/${transactionId}/receipt`)
    const url = URL.createObjectURL(blob)
    if (newTab) {
      newTab.location.href = url
    } else {
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
    }
  } catch (err) {
    newTab?.close()
    throw err
  }
}

export interface TransactionWithBusiness extends Transaction {
  businessId: string
  businessName: string
  currency: string
}

interface BusinessRef {
  id: string
  name: string
  currency: string
}

// Used for the "All businesses" dashboard view — the API only exposes
// transactions per business, so recent activity across every business is
// assembled client-side from one request per business.
export function useRecentTransactionsAcross(businesses: BusinessRef[]) {
  const results = useQueries({
    queries: businesses.map((business) => ({
      queryKey: ['transactions', business.id],
      queryFn: () => api.get<Transaction[]>(`/businesses/${business.id}/transactions`),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const merged: TransactionWithBusiness[] = results.flatMap((result, index) => {
    const business = businesses[index]
    return (result.data ?? []).map((tx) => ({
      ...tx,
      businessId: business.id,
      businessName: business.name,
      currency: business.currency,
    }))
  })
  merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { data: merged, isLoading }
}

export type BulkTransactionRow = Omit<TransactionInput, 'accountId'>

export interface BulkCreateResult {
  importBatchId: string
  created: number
  totalIn: number
  totalOut: number
}

// Adds many entries at once, all or nothing (POST .../transactions/bulk).
export function useBulkCreateTransactions(businessId: string, accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { rows: BulkTransactionRow[]; importBatchId?: string }) =>
      api.post<BulkCreateResult>(`/businesses/${businessId}/accounts/${accountId}/transactions/bulk`, input),
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}

// "Undo" for a paste or import: removes the entries of that batch.
export function useUndoTransactionBatch(businessId: string, accountId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (importBatchId: string) =>
      api.delete<{ deleted: number }>(`/businesses/${businessId}/accounts/${accountId}/transactions/batch/${importBatchId}`),
    onSuccess: () => invalidateTransactionQueries(queryClient, businessId),
  })
}
