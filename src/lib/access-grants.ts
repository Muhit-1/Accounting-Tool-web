import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { AccessGrant, AccessPermission } from '../types/api'

export function useAccessGrants(businessId: string | undefined) {
  return useQuery({
    queryKey: ['access-grants', businessId],
    queryFn: () => api.get<AccessGrant[]>(`/businesses/${businessId}/access-grants`),
    enabled: Boolean(businessId),
  })
}

// BUSINESS = everything; TABLE = one table (its rows: look at them, or add / change / delete them).
export type CreateAccessGrantInput = {
  granteeEmail: string
  permission: AccessPermission
  expiresAt: string
} & ({ scope: 'BUSINESS' } | { scope: 'TABLE'; tableId: string })

export function useCreateAccessGrant(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccessGrantInput) =>
      api.post<AccessGrant>(`/businesses/${businessId}/access-grants`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-grants', businessId] }),
  })
}

export function useRevokeAccessGrant(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/access-grants/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['access-grants', businessId] }),
  })
}

export interface SharedWithMeEntry {
  id: string
  business: { id: string; name: string; currency: string }
  permission: AccessPermission
  expiresAt: string
  // null = the whole business; otherwise the one table that was shared
  tableId: string | null
  tableName: string | null
}

export function useSharedWithMe() {
  return useQuery({
    queryKey: ['shared-with-me'],
    queryFn: () => api.get<SharedWithMeEntry[]>('/shared-with-me'),
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
