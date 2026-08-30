import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Ledger } from '../types/api'

export function useLedgers(businessId: string | undefined) {
  return useQuery({
    queryKey: ['ledgers', businessId],
    queryFn: () => api.get<Ledger[]>(`/businesses/${businessId}/ledgers`),
    enabled: Boolean(businessId),
  })
}

export function useLedger(businessId: string | undefined, ledgerId: string | undefined) {
  return useQuery({
    queryKey: ['ledgers', businessId, ledgerId],
    queryFn: () => api.get<Ledger>(`/businesses/${businessId}/ledgers/${ledgerId}`),
    enabled: Boolean(businessId) && Boolean(ledgerId),
  })
}

export function useCreateLedger(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => api.post<Ledger>(`/businesses/${businessId}/ledgers`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ledgers', businessId] }),
  })
}

export function useRenameLedger(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch<Ledger>(`/businesses/${businessId}/ledgers/${id}`, { name }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ledgers', businessId] }),
  })
}

export function useDeleteLedger(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/ledgers/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ledgers', businessId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
    },
  })
}
