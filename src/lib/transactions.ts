import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { CategoryType, Transaction } from '../types/api'

export function useTransactions(businessId: string | undefined, ledgerId?: string) {
  return useQuery({
    queryKey: ['transactions', businessId, ledgerId],
    queryFn: () =>
      api.get<Transaction[]>(
        `/businesses/${businessId}/transactions${ledgerId ? `?ledgerId=${ledgerId}` : ''}`,
      ),
    enabled: Boolean(businessId),
  })
}

export interface TransactionInput {
  ledgerId: string
  date: string
  memo?: string
  counterparty?: string
  categoryId?: string
  amount: number
  type: CategoryType
}

function invalidateTransactionQueries(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
  queryClient.invalidateQueries({ queryKey: ['ledgers', businessId] })
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
