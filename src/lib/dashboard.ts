import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { BusinessDashboard, CombinedDashboard } from '../types/api'

export function useCombinedDashboard() {
  return useQuery({
    queryKey: ['dashboard', 'combined'],
    queryFn: () => api.get<CombinedDashboard>('/dashboard'),
  })
}

export function useBusinessDashboard(businessId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', businessId],
    queryFn: () => api.get<BusinessDashboard>(`/businesses/${businessId}/dashboard`),
    enabled: Boolean(businessId),
  })
}
