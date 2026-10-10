import { useEffect, useState } from 'react'
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError } from './api-client'
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

// Mirrors accounting-api/src/invoice/invoice-status.ts (the API is the one that
// enforces it); keep both in step. Used only to offer sensible choices.
const NEXT_STATUSES: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ['SENT', 'CANCELLED'],
  SENT: ['PAID', 'OVERDUE', 'CANCELLED'],
  OVERDUE: ['PAID', 'SENT', 'CANCELLED'],
  PAID: ['SENT'],
  CANCELLED: [],
}

export function statusChoices(current: InvoiceStatus): InvoiceStatus[] {
  return [current, ...NEXT_STATUSES[current]]
}

// Only a draft can still change; a sent invoice is what the customer holds.
export const isInvoiceEditable = (status: InvoiceStatus) => status === 'DRAFT'
export const isInvoiceDeletable = (status: InvoiceStatus) => status === 'DRAFT' || status === 'CANCELLED'

export interface InvoiceItemInput {
  description: string
  quantity: number
  rate: number
}

export interface CreateInvoiceInput {
  clientId: string
  number?: string
  issueDate: string
  terms: string
  dueDate: string
  items: InvoiceItemInput[]
}

export function useNextInvoiceNumber(businessId: string | undefined) {
  return useQuery({
    queryKey: ['invoices', businessId, 'next-number'],
    queryFn: () => api.get<{ number: string }>(`/businesses/${businessId}/invoices/next-number`),
    enabled: Boolean(businessId),
  })
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

export function useUpdateInvoice(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CreateInvoiceInput> & { id: string }) =>
      api.patch<Invoice>(`/businesses/${businessId}/invoices/${id}`, input),
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

// Renders the same PDF the download button saves, inline — so the user can
// see exactly what they're about to send before deciding to download it
// (mirrors how most invoicing tools show a live preview alongside the list).
export function useInvoicePdfPreview(businessId: string | undefined, invoiceId: string | undefined) {
  const key = businessId && invoiceId ? `${businessId}/${invoiceId}` : null
  // Results are tagged with the invoice they belong to, so "loading" is
  // derived (no result for the current key yet) instead of being set
  // synchronously inside the effect.
  const [result, setResult] = useState<{ key: string; url: string | null; error: string | null } | null>(null)

  useEffect(() => {
    if (!key || !businessId || !invoiceId) return
    let cancelled = false
    let objectUrl: string | null = null

    api
      .getBlob(`/businesses/${businessId}/invoices/${invoiceId}/pdf`)
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setResult({ key, url: objectUrl, error: null })
      })
      .catch((err) => {
        if (cancelled) return
        setResult({ key, url: null, error: err instanceof ApiError ? err.message : 'Could not load the preview.' })
      })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [key, businessId, invoiceId])

  const current = result && result.key === key ? result : null
  return { url: current?.url ?? null, isLoading: key !== null && current === null, error: current?.error ?? null }
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
