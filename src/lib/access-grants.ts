import { useQueries, useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { AccessGrant } from '../types/api'

export function useAccessGrants(businessId: string | undefined) {
  return useQuery({
    queryKey: ['access-grants', businessId],
    queryFn: () => api.get<AccessGrant[]>(`/businesses/${businessId}/access-grants`),
    enabled: Boolean(businessId),
  })
}

export interface AccessGrantWithBusiness extends AccessGrant {
  businessName: string
}

export function useAccessGrantsAcross(businesses: { id: string; name: string }[]) {
  const results = useQueries({
    queries: businesses.map((business) => ({
      queryKey: ['access-grants', business.id],
      queryFn: () => api.get<AccessGrant[]>(`/businesses/${business.id}/access-grants`),
    })),
  })

  const isLoading = results.some((r) => r.isLoading)
  const merged: AccessGrantWithBusiness[] = results.flatMap((result, index) => {
    const business = businesses[index]
    return (result.data ?? []).map((grant) => ({ ...grant, businessName: business.name }))
  })
  merged.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())

  return { data: merged, isLoading }
}
