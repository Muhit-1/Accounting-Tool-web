import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { Invoice } from '../types/api'

export function useInvoices(businessId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => api.get<Invoice[]>(`/businesses/${businessId}/invoices`),
    enabled: Boolean(businessId),
  })
}

export interface InvoiceWithBusiness extends Invoice {
  businessName: string
  currency: string
}

interface BusinessRef {
  id: string
  name: string
  currency: string
}

// Same pattern as useRecentTransactionsAcross — invoices are per-business
// on the API, merged client-side for the "All businesses" view.
export function useInvoicesAcross(businesses: BusinessRef[]) {
  const results = useQueries({
    queries: businesses.map((business) => ({
      queryKey: ['invoices', business.id],
      queryFn: () => api.get<Invoice[]>(`/businesses/${business.id}/invoices`),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const merged: InvoiceWithBusiness[] = results.flatMap((result, index) => {
    const business = businesses[index]
    return (result.data ?? []).map((invoice) => ({
      ...invoice,
      businessName: business.name,
      currency: business.currency,
    }))
  })
  merged.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime())

  return { data: merged, isLoading }
}
