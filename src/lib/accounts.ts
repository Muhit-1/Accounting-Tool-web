import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Account } from '../types/api'

export function useAccounts(businessId: string | undefined) {
  return useQuery({
    queryKey: ['accounts', businessId],
    queryFn: () => api.get<Account[]>(`/businesses/${businessId}/accounts`),
    enabled: Boolean(businessId),
  })
}

export function useAccount(businessId: string | undefined, accountId: string | undefined) {
  return useQuery({
    queryKey: ['accounts', businessId, accountId],
    queryFn: () => api.get<Account>(`/businesses/${businessId}/accounts/${accountId}`),
    enabled: Boolean(businessId) && Boolean(accountId),
  })
}

export function useCreateAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Account>(`/businesses/${businessId}/accounts`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', businessId] }),
  })
}

export function useRenameAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Account>(`/businesses/${businessId}/accounts/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['accounts', businessId] }),
  })
}

export function useDeleteAccount(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/accounts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts', businessId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
    },
  })
}
