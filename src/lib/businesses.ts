import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Business, CreateBusinessInput } from '../types/api'

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
