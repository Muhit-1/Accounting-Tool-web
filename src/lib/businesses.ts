import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Business, CreateBusinessInput } from '../types/api'

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
