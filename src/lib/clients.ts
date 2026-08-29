import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Client } from '../types/api'

export interface ClientInput {
  name: string
  address: string
  email?: string
}

export function useClients(businessId: string | undefined) {
  return useQuery({
    queryKey: ['clients', businessId],
    queryFn: () => api.get<Client[]>(`/businesses/${businessId}/clients`),
    enabled: Boolean(businessId),
  })
}

export function useCreateClient(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ClientInput) => api.post<Client>(`/businesses/${businessId}/clients`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', businessId] }),
  })
}

export function useDeleteClient(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/clients/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients', businessId] }),
  })
}
