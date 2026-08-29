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

// Only BUSINESS scope is exposed here — the API also accepts TABLE scope,
// but nothing enforces it per-resource yet (see BusinessService.assertAccess
// on the backend), so offering it in this form would grant the appearance
// of a restriction that doesn't actually apply.
export interface CreateAccessGrantInput {
  granteeEmail: string
  scope: 'BUSINESS'
  permission: AccessPermission
  expiresAt: string
}

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
