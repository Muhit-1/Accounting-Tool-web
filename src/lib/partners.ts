import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Partner } from '../types/api'

export function usePartners(businessId: string | undefined) {
  return useQuery({
    queryKey: ['partners', businessId],
    queryFn: () => api.get<Partner[]>(`/businesses/${businessId}/partners`),
    enabled: Boolean(businessId),
  })
}

export function useCreatePartner(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Partner>(`/businesses/${businessId}/partners`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', businessId] }),
  })
}

export function useRenamePartner(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => api.patch<Partner>(`/businesses/${businessId}/partners/${id}`, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', businessId] })
      queryClient.invalidateQueries({ queryKey: ['costs', businessId] })
    },
  })
}

export function useDeletePartner(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/partners/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partners', businessId] }),
  })
}
