import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Business, BusinessSummary, BusinessTemplate, CreateBusinessInput } from '../types/api'

export type UpdateBusinessInput = Partial<
  Pick<
    Business,
    | 'name'
    | 'currency'
    | 'logoUrl'
    | 'address'
    | 'contactEmail'
    | 'website'
    | 'bankAccountName'
    | 'bankAccountNumber'
    | 'bankRoutingNumber'
    | 'bankSwiftCode'
    | 'bankBranch'
    | 'defaultTerms'
    | 'country'
  >
>

export function useBusinesses() {
  return useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get<Business[]>('/businesses'),
  })
}

export function useBusiness(businessId: string | undefined) {
  return useQuery({
    queryKey: ['businesses', businessId],
    queryFn: () => api.get<Business>(`/businesses/${businessId}`),
    enabled: Boolean(businessId),
  })
}

export function useCreateBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateBusinessInput) => api.post<Business>('/businesses', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

export function useUpdateBusiness(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: UpdateBusinessInput) => api.patch<Business>(`/businesses/${businessId}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['businesses', businessId] })
    },
  })
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (businessId: string) => api.delete(`/businesses/${businessId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
    },
  })
}

// Everything the Home screen and the business switcher need, in one request: yours and the ones shared with you.
export function useBusinessSummaries() {
  return useQuery({
    queryKey: ['businesses', 'summaries'],
    queryFn: () => api.get<BusinessSummary[]>('/businesses/summaries'),
  })
}

// Remembers what the person opened last (the Home list is ordered by it). Failing is harmless.
export function markOpened(businessId: string, tableId?: string) {
  return api.post(`/businesses/${businessId}/opened`, tableId ? { tableId } : {}).catch(() => undefined)
}

export function useBusinessTemplates() {
  return useQuery({
    queryKey: ['business-templates'],
    queryFn: () => api.get<BusinessTemplate[]>('/business-templates'),
    staleTime: 10 * 60_000,
  })
}

export function useCreateFromBusinessTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, ...input }: { key: string; name: string; currency?: string; country?: string | null }) =>
      api.post<Business>(`/business-templates/${key}/businesses`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  })
}

export function useCopyBusiness(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { name?: string; withRows?: boolean }) => api.post<Business>(`/businesses/${businessId}/copy`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['businesses'] }),
  })
}
