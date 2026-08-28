import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { Transaction } from '../types/api'

export function useTransactions(businessId: string | undefined) {
  return useQuery({
    queryKey: ['transactions', businessId],
    queryFn: () => api.get<Transaction[]>(`/businesses/${businessId}/transactions`),
    enabled: Boolean(businessId),
  })
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
