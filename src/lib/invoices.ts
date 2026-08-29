import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Invoice, InvoiceStatus } from '../types/api'

export function useInvoices(businessId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', businessId],
    queryFn: () => api.get<Invoice[]>(`/businesses/${businessId}/invoices`),
    enabled: Boolean(businessId),
  })
}

export function useInvoice(businessId: string | undefined, invoiceId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', businessId, invoiceId],
    queryFn: () => api.get<Invoice>(`/businesses/${businessId}/invoices/${invoiceId}`),
    enabled: Boolean(businessId) && Boolean(invoiceId),
  })
}

export interface InvoiceItemInput {
  description: string
  quantity: number
  rate: number
}

export interface CreateInvoiceInput {
  clientId: string
  issueDate: string
  terms: string
  dueDate: string
  items: InvoiceItemInput[]
}

function invalidateInvoiceQueries(queryClient: ReturnType<typeof useQueryClient>, businessId: string) {
  queryClient.invalidateQueries({ queryKey: ['invoices', businessId] })
  queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
}

export function useCreateInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => api.post<Invoice>(`/businesses/${businessId}/invoices`, input),
    onSuccess: () => invalidateInvoiceQueries(queryClient, businessId),
  })
}

export function useUpdateInvoiceStatus(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatus }) =>
      api.patch<Invoice>(`/businesses/${businessId}/invoices/${id}/status`, { status }),
    onSuccess: () => invalidateInvoiceQueries(queryClient, businessId),
  })
}

export function useDeleteInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/invoices/${id}`),
    onSuccess: () => {
      // Deliberately don't touch the deleted invoice's own detail query
      // here (['invoices', businessId, id]) — the detail page is usually
      // still mounted at this point (navigate() away hasn't happened yet),
      // so invalidating or removing it makes its still-subscribed query
      // observer refetch immediately and 404. It unsubscribes on its own
      // once the page navigates away, with nothing left needing a refetch.
      queryClient.invalidateQueries({ queryKey: ['invoices', businessId], exact: true })
      queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
    },
  })
}

export async function downloadInvoicePdf(businessId: string, invoiceId: string, filename: string) {
  const blob = await api.getBlob(`/businesses/${businessId}/invoices/${invoiceId}/pdf`)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
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
